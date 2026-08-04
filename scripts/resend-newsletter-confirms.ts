/**
 * Re-send newsletter confirmation emails to users who opted in but never
 * confirmed (their token expired or was ignored under the old two-click flow).
 *
 * DRY RUN by default — prints the recipient list and changes nothing.
 * Pass --send to actually issue fresh tokens and send.
 *
 *   npx tsx --env-file=.env.local scripts/resend-newsletter-confirms.ts
 *   npx tsx --env-file=.env.local scripts/resend-newsletter-confirms.ts --send
 *
 * Skips addresses that have already bounced and internal test accounts.
 * APP_URL defaults to production — NEXT_PUBLIC_APP_URL is deliberately NOT used,
 * since .env.local points at localhost and would send dead links to real people.
 */
import postgres from "postgres";
import { Resend } from "resend";

const SEND = process.argv.includes("--send");
const APP_URL = process.env.APP_URL || "https://www.hymnz.com";

// HymnzShell now refuses localhost on its own, but it reads NEXT_PUBLIC_APP_URL
// at module load — so setting it here (before the dynamic imports below) is what
// keeps the footer pointed at the same host as the confirm links.
process.env.NEXT_PUBLIC_APP_URL = APP_URL;

// Match the sender these recipients got their original confirm email from.
// .env.local uses hello@ locally, which would look like a different sender.
process.env.EMAIL_FROM = process.env.EMAIL_FROM_OVERRIDE || "HYMNZ <noreply@hymnz.com>";

const isTestAddress = (e: string) =>
  /@hymnz\.(com|local)$/i.test(e) || /grilltest/i.test(e);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Anything that has ever bounced is suppressed — re-sending hurts reputation.
  const { data } = await resend.emails.list({ limit: 100 } as never);
  const bounced = new Set(
    ((data as { data?: Record<string, unknown>[] })?.data ?? [])
      .filter((e) => (e.last_event ?? e.status) === "bounced")
      .flatMap((e) => (Array.isArray(e.to) ? e.to : [e.to]))
      .map((x) => String(x).toLowerCase())
  );

  const rows = await sql<{ id: string; email: string; name: string | null }[]>`
    select distinct u.id, u.email, u.name
    from newsletter_confirm_tokens t
    join users u on u.id = t.user_id
    where t.used_at is null and u.newsletter_opt_in = false
  `;

  const targets = rows.filter(
    (r) => !bounced.has(r.email.toLowerCase()) && !isTestAddress(r.email)
  );

  console.log(`Link base: ${APP_URL}`);
  console.log(`Eligible recipients: ${targets.length} (of ${rows.length} unconfirmed)`);

  if (!SEND) {
    for (const r of targets) console.log(`  would send -> ${r.email}`);
    console.log(`\nDRY RUN — nothing sent. Re-run with --send to send.`);
    await sql.end();
    return;
  }

  const { createNewsletterConfirmToken } = await import(
    "../src/lib/email/newsletter-confirm"
  );
  const { sendNewsletterConfirmEmail } = await import("../src/lib/email/resend");

  let sent = 0;
  const failed: { email: string; error: string }[] = [];

  for (const r of targets) {
    try {
      const token = await createNewsletterConfirmToken(r.id);
      await sendNewsletterConfirmEmail(
        r.email,
        `${APP_URL}/auth/confirm-newsletter?token=${token}`,
        r.name?.trim() || undefined
      );
      sent += 1;
      console.log(`  sent -> ${r.email}`);
    } catch (err) {
      failed.push({ email: r.email, error: String(err) });
      console.log(`  FAILED -> ${r.email}: ${String(err)}`);
    }
    await sleep(600); // stay under Resend's 2 req/s limit
  }

  console.log(`\nSent ${sent}/${targets.length}. Failed: ${failed.length}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
