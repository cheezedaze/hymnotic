/**
 * Backfill: create Resend contacts for DB users with newsletterOptIn=true
 * that are missing from Resend. Verifies the create path with testuser first.
 * Mirrors src/lib/email/newsletter.ts addContactToNewsletter().
 * Run: npx tsx --env-file=.env.local scripts/backfill-newsletter.ts
 */
import postgres from "postgres";
import { Resend } from "resend";

const norm = (e: string) => e.trim().toLowerCase();
const VERIFY_FIRST = "testuser@hymnz.com";

async function addContact(
  resend: Resend,
  segmentId: string,
  email: string,
  firstName?: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { error } = await resend.contacts.create({
    email,
    firstName: firstName || undefined,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  } as unknown as Parameters<typeof resend.contacts.create>[0]);

  if (error) {
    const msg = JSON.stringify(error);
    if (/exist/i.test(msg)) return { ok: true, skipped: true };
    return { ok: false, error: msg };
  }
  return { ok: true };
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const segmentId = process.env.RESEND_AUDIENCE_ID!;

  const dbRows = await sql<{ email: string; name: string | null }[]>`
    select email, name from users where newsletter_opt_in = true order by email
  `;
  const globalContacts = await resend.contacts.list();
  const globalEmails = new Set(
    ((globalContacts.data as any)?.data ?? []).map((c: any) => norm(c.email))
  );

  const missing = dbRows.filter((r) => !globalEmails.has(norm(r.email)));
  console.log(`DB opt-ins: ${dbRows.length}, missing from Resend: ${missing.length}`);

  // 1. Verify the create path with the test user first.
  const verifyRow = missing.find((r) => norm(r.email) === VERIFY_FIRST);
  if (verifyRow) {
    console.log(`\n[verify] creating ${verifyRow.email} ...`);
    const res = await addContact(resend, segmentId, verifyRow.email, verifyRow.name ?? undefined);
    if (!res.ok) {
      console.error(`[verify] FAILED — aborting backfill. Error: ${res.error}`);
      await sql.end();
      process.exit(1);
    }
    console.log(`[verify] OK${res.skipped ? " (already existed)" : ""} — create path works.`);
  }

  // 2. Backfill the rest.
  const rest = missing.filter((r) => norm(r.email) !== VERIFY_FIRST);
  let added = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const r of rest) {
    const res = await addContact(resend, segmentId, r.email, r.name ?? undefined);
    if (!res.ok) {
      failures.push(`${r.email}: ${res.error}`);
      console.log(`  ✗ ${r.email}`);
    } else if (res.skipped) {
      skipped++;
      console.log(`  ~ ${r.email} (already existed)`);
    } else {
      added++;
      console.log(`  ✓ ${r.email}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`Added: ${added}, already existed: ${skipped}, failed: ${failures.length}`);
  if (failures.length) {
    console.log("Failures:");
    failures.forEach((f) => console.log("  " + f));
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
