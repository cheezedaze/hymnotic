/**
 * Purge confirmed bot signups from Resend + the DB.
 * DRY-RUN by default — prints what it WOULD delete and exits.
 * Pass --confirm to actually delete.
 *
 * Run (dry-run):
 *   DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/cleanup-bot-signups.ts
 * Run (delete):
 *   DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/cleanup-bot-signups.ts --confirm
 */
import postgres from "postgres";
import { Resend } from "resend";
import {
  looksGibberish,
  gmailDotCount,
  gmailCanonical,
} from "../src/lib/security/bot-detection";

type Row = {
  id: string;
  email: string;
  name: string | null;
  has_password: boolean;
  role: string;
  is_premium: boolean;
  manual_premium: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  plays: number;
  play_events: number;
  favorites: number;
  onboarding_rows: number;
  dismissals: number;
};

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const rows = await sql<Row[]>`
    select
      u.id, u.email, u.name,
      u.password_hash is not null as has_password,
      u.role, u.is_premium, u.manual_premium,
      u.stripe_customer_id, u.subscription_status,
      (select count(*)::int from user_track_plays p where p.user_id = u.id) as plays,
      (select count(*)::int from play_events e where e.user_id = u.id) as play_events,
      (select count(*)::int from user_favorites f where f.user_id = u.id) as favorites,
      (select count(*)::int from onboarding_responses o where o.user_id = u.id) as onboarding_rows,
      (select count(*)::int from announcement_dismissals d where d.user_id = u.id) as dismissals
    from users u
    order by u.created_at asc
  `;

  const isProtected = (r: Row) =>
    r.role === "ADMIN" ||
    r.is_premium ||
    r.manual_premium ||
    !!r.stripe_customer_id ||
    (r.subscription_status != null &&
      ["active", "trialing", "past_due"].includes(r.subscription_status));

  const hasChildRows = (r: Row) =>
    r.plays > 0 ||
    r.play_events > 0 ||
    r.favorites > 0 ||
    r.onboarding_rows > 0 ||
    r.dismissals > 0;

  const canonMap = new Map<string, number>();
  for (const r of rows) {
    const c = gmailCanonical(r.email);
    if (c) canonMap.set(c, (canonMap.get(c) ?? 0) + 1);
  }

  const score = (r: Row): number => {
    let s = 0;
    if (looksGibberish(r.name)) s += 3;
    if (gmailDotCount(r.email) >= 4) s += 2;
    const c = gmailCanonical(r.email);
    if (c && (canonMap.get(c) ?? 0) > 1) s += 2;
    return s;
  };

  const targets = rows.filter(
    (r) => score(r) >= 3 && !isProtected(r) && !hasChildRows(r)
  );

  console.log(`\n=== CLEANUP ${CONFIRM ? "(LIVE)" : "(DRY-RUN)"} ===`);
  console.log(`Total users: ${rows.length}`);
  console.log(`Delete candidates: ${targets.length}\n`);
  for (const t of targets) {
    console.log(`  ${JSON.stringify(t.name)}  <${t.email}>`);
  }

  if (!CONFIRM) {
    console.log(`\nDRY-RUN — nothing deleted. Re-run with --confirm to delete.\n`);
    await sql.end();
    return;
  }

  let resendRemoved = 0;
  let dbDeleted = 0;
  for (const t of targets) {
    try {
      const { data: contact } = await resend.contacts.get({
        email: t.email,
      } as Parameters<typeof resend.contacts.get>[0]);
      if (contact?.id) {
        await resend.contacts.remove({
          id: contact.id,
        } as Parameters<typeof resend.contacts.remove>[0]);
        resendRemoved += 1;
      }
    } catch (e) {
      console.warn(`  Resend remove failed for ${t.email}:`, (e as Error).message);
    }

    await sql`delete from users where id = ${t.id}`;
    dbDeleted += 1;
  }

  console.log(`\nDeleted ${dbDeleted} users; removed ${resendRemoved} Resend contacts.\n`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
