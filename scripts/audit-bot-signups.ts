/**
 * READ-ONLY audit of likely bot/spam signups.
 * Makes only SELECT queries. Writes NOTHING to the DB or Resend.
 * It also writes a CSV of candidates to scripts/bot-signup-candidates.csv
 * for review BEFORE any cleanup — deleting nothing on its own.
 *
 * Run: npx tsx --env-file=.env.local scripts/audit-bot-signups.ts
 */
import postgres from "postgres";
import { writeFileSync } from "node:fs";

type Row = {
  id: string;
  email: string;
  name: string | null;
  has_password: boolean;
  newsletter_opt_in: boolean;
  role: string;
  is_premium: boolean;
  manual_premium: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  account_tier: string;
  onboarding_completed_at: Date | null;
  created_at: Date;
  plays: number;
  play_events: number;
  favorites: number;
  onboarding_rows: number;
};

// --- Heuristics ----------------------------------------------------------

/** Random base64-ish names like "KRIgLssCUBhsCiQUfMM" — NOT real names. */
function looksGibberish(name: string | null): boolean {
  if (!name) return false;
  const n = name.trim();
  const letters = n.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 8) return false;
  const noSpace = !/\s/.test(n);
  const vowels = (n.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowels / letters.length;
  // Count lowercase -> uppercase transitions (camel-noise like xYxYxY).
  let caseFlips = 0;
  for (let i = 1; i < n.length; i++) {
    if (/[a-z]/.test(n[i - 1]) && /[A-Z]/.test(n[i])) caseFlips++;
  }
  return noSpace && (caseFlips >= 3 || vowelRatio < 0.25);
}

/** Number of dots in the local part of a gmail/googlemail address. */
function gmailDotCount(email: string): number {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || !/^(gmail\.com|googlemail\.com)$/.test(domain)) return 0;
  return (local.match(/\./g) || []).length;
}

/** Canonical gmail inbox (dots removed, +suffix stripped) for collision detection. */
function gmailCanonical(email: string): string | null {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || !/^(gmail\.com|googlemail\.com)$/.test(domain)) return null;
  return local.split("+")[0].replace(/\./g, "") + "@gmail.com";
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const hourKey = (d: Date) => d.toISOString().slice(0, 13) + ":00";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  const rows = await sql<Row[]>`
    select
      u.id,
      u.email,
      u.name,
      u.password_hash is not null as has_password,
      u.newsletter_opt_in,
      u.role,
      u.is_premium,
      u.manual_premium,
      u.stripe_customer_id,
      u.subscription_status,
      u.account_tier,
      u.onboarding_completed_at,
      u.created_at,
      (select count(*)::int from user_track_plays p where p.user_id = u.id) as plays,
      (select count(*)::int from play_events e where e.user_id = u.id) as play_events,
      (select count(*)::int from user_favorites f where f.user_id = u.id) as favorites,
      (select count(*)::int from onboarding_responses o where o.user_id = u.id) as onboarding_rows
    from users u
    order by u.created_at asc
  `;

  // --- Classify ----------------------------------------------------------
  const protectedReason = (r: Row): string | null => {
    if (r.role === "ADMIN") return "admin";
    if (r.is_premium || r.manual_premium) return "premium";
    if (r.stripe_customer_id) return "stripe-customer";
    if (
      r.subscription_status &&
      ["active", "trialing", "past_due"].includes(r.subscription_status)
    )
      return "subscription";
    return null;
  };

  const isEngaged = (r: Row): boolean =>
    r.plays > 0 ||
    r.play_events > 0 ||
    r.favorites > 0 ||
    r.onboarding_rows > 0 ||
    r.onboarding_completed_at != null;

  // Gmail inbox collisions (multiple accounts -> same real inbox).
  const canonMap = new Map<string, Row[]>();
  for (const r of rows) {
    const c = gmailCanonical(r.email);
    if (!c) continue;
    (canonMap.get(c) ?? canonMap.set(c, []).get(c)!).push(r);
  }
  const collidingCanon = new Set(
    [...canonMap.entries()].filter(([, v]) => v.length > 1).map(([k]) => k)
  );

  type Tag = {
    row: Row;
    reasons: string[];
    score: number;
  };

  const keep: Row[] = []; // protected or engaged — never touch
  const likelyBot: Tag[] = [];
  const review: Tag[] = []; // suspicious but not clear-cut

  for (const r of rows) {
    const prot = protectedReason(r);
    if (prot || isEngaged(r)) {
      keep.push(r);
      continue;
    }

    const reasons: string[] = [];
    let score = 0;
    if (looksGibberish(r.name)) {
      reasons.push("gibberish-name");
      score += 3;
    }
    const dots = gmailDotCount(r.email);
    if (dots >= 4) {
      reasons.push(`gmail-dots:${dots}`);
      score += 2;
    }
    const canon = gmailCanonical(r.email);
    if (canon && collidingCanon.has(canon)) {
      reasons.push("gmail-inbox-collision");
      score += 2;
    }
    if (!r.name) reasons.push("no-name");
    if (r.has_password) reasons.push("form-signup");
    else reasons.push("oauth-signup");

    const tag: Tag = { row: r, reasons, score };
    if (score >= 3) likelyBot.push(tag);
    else if (score >= 2) review.push(tag);
    // score 0–1 with no real signal: leave out of candidate lists entirely.
  }

  // --- Burst histogram (signups per day) ---------------------------------
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(dayKey(r.created_at), (perDay.get(dayKey(r.created_at)) ?? 0) + 1);
  const perDayBot = new Map<string, number>();
  for (const t of likelyBot)
    perDayBot.set(dayKey(t.row.created_at), (perDayBot.get(dayKey(t.row.created_at)) ?? 0) + 1);

  // Tightest burst: max signups in any single hour.
  const perHour = new Map<string, number>();
  for (const r of rows) perHour.set(hourKey(r.created_at), (perHour.get(hourKey(r.created_at)) ?? 0) + 1);
  const topHours = [...perHour.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // --- Report ------------------------------------------------------------
  const pct = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;
  console.log(`\n========================================`);
  console.log(`  BOT SIGNUP AUDIT  (read-only)`);
  console.log(`========================================`);
  console.log(`Total users:            ${rows.length}`);
  console.log(`  Form signups:         ${rows.filter((r) => r.has_password).length}`);
  console.log(`  OAuth signups:        ${rows.filter((r) => !r.has_password).length}`);
  console.log(`  newsletterOptIn=true: ${rows.filter((r) => r.newsletter_opt_in).length}`);
  console.log(`\n--- Classification ---`);
  console.log(`KEEP (protected/engaged): ${keep.length}  (${pct(keep.length)})`);
  console.log(`LIKELY BOT (score>=3):    ${likelyBot.length}  (${pct(likelyBot.length)})`);
  console.log(`REVIEW (score 2):         ${review.length}  (${pct(review.length)})`);
  console.log(
    `   ...of LIKELY BOT, opted into newsletter: ${likelyBot.filter((t) => t.row.newsletter_opt_in).length}`
  );

  console.log(`\n--- Signups per day (last 20 days with activity) ---`);
  const days = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-20);
  for (const [d, n] of days) {
    const bots = perDayBot.get(d) ?? 0;
    const bar = "#".repeat(Math.min(60, n));
    console.log(`  ${d}  ${String(n).padStart(4)}  (${bots} bot)  ${bar}`);
  }

  console.log(`\n--- Tightest signup bursts (top 5 hours) ---`);
  for (const [h, n] of topHours) console.log(`  ${h}  ${n} signups`);

  console.log(`\n--- Sample LIKELY BOT (first 25) ---`);
  for (const t of likelyBot.slice(0, 25)) {
    console.log(
      `  ${t.row.created_at.toISOString().slice(0, 16)}  [${t.reasons.join(",")}]  ${JSON.stringify(
        t.row.name
      )}  <${t.row.email}>`
    );
  }

  if (review.length) {
    console.log(`\n--- Sample REVIEW (first 15) ---`);
    for (const t of review.slice(0, 15)) {
      console.log(
        `  ${t.row.created_at.toISOString().slice(0, 16)}  [${t.reasons.join(",")}]  ${JSON.stringify(
          t.row.name
        )}  <${t.row.email}>`
      );
    }
  }

  // --- CSV for review ----------------------------------------------------
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "bucket,score,reasons,id,email,name,has_password,newsletter_opt_in,created_at",
    ...likelyBot.map((t) =>
      [
        "likely_bot",
        t.score,
        esc(t.reasons.join("|")),
        esc(t.row.id),
        esc(t.row.email),
        esc(t.row.name),
        t.row.has_password,
        t.row.newsletter_opt_in,
        t.row.created_at.toISOString(),
      ].join(",")
    ),
    ...review.map((t) =>
      [
        "review",
        t.score,
        esc(t.reasons.join("|")),
        esc(t.row.id),
        esc(t.row.email),
        esc(t.row.name),
        t.row.has_password,
        t.row.newsletter_opt_in,
        t.row.created_at.toISOString(),
      ].join(",")
    ),
  ].join("\n");
  const outPath = "scripts/bot-signup-candidates.csv";
  writeFileSync(outPath, csv);
  console.log(`\nWrote ${likelyBot.length + review.length} candidates to ${outPath}`);
  console.log(`(NOTHING was deleted. Review the CSV before any cleanup.)\n`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
