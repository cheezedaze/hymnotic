/**
 * READ-ONLY diagnostic for the newsletter DB <-> Resend discrepancy.
 * Makes only GET/list calls. Writes nothing to the DB or Resend.
 * Run: npx tsx --env-file=.env.local scripts/diagnose-newsletter.ts
 */
import postgres from "postgres";
import { Resend } from "resend";

const norm = (e: string) => e.trim().toLowerCase();

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const configuredId = process.env.RESEND_AUDIENCE_ID ?? "(unset)";

  // 1. DB opt-ins
  const dbRows = await sql<{ email: string; name: string | null }[]>`
    select email, name from users where newsletter_opt_in = true order by email
  `;
  const dbEmails = new Set(dbRows.map((r) => norm(r.email)));
  console.log(`\n=== DB ===`);
  console.log(`Users with newsletterOptIn=true: ${dbRows.length}`);

  // 2. Segments in Resend — is RESEND_AUDIENCE_ID a real segment?
  console.log(`\n=== Resend segments ===`);
  console.log(`Configured RESEND_AUDIENCE_ID = ${configuredId}`);
  let configuredIsSegment = false;
  try {
    const segs = await resend.segments.list();
    const list = (segs.data as any)?.data ?? segs.data ?? [];
    for (const s of list as any[]) {
      const match = s.id === configuredId ? "  <-- configured" : "";
      console.log(`  ${s.id}  "${s.name}"${match}`);
      if (s.id === configuredId) configuredIsSegment = true;
    }
    if (!list.length) console.log("  (no segments returned)");
  } catch (e) {
    console.log("  segments.list error:", (e as Error).message);
  }
  console.log(
    configuredIsSegment
      ? "  ✓ RESEND_AUDIENCE_ID matches a real segment"
      : "  ✗ RESEND_AUDIENCE_ID does NOT match any segment (likely an OLD audience id)"
  );

  // 3. Global contacts
  const globalContacts = await resend.contacts.list();
  const globalArr: any[] = (globalContacts.data as any)?.data ?? [];
  const globalEmails = new Set(globalArr.map((c) => norm(c.email)));
  console.log(`\n=== Resend global contacts ===`);
  console.log(`Total global contacts: ${globalArr.length}`);

  // 4. Contacts filtered to the configured segment
  let segmentEmails = new Set<string>();
  try {
    const segContacts = await resend.contacts.list({
      segmentId: configuredId,
    } as any);
    const segArr: any[] = (segContacts.data as any)?.data ?? [];
    segmentEmails = new Set(segArr.map((c) => norm(c.email)));
    console.log(`Contacts IN configured segment: ${segArr.length}`);
  } catch (e) {
    console.log("  contacts.list({segmentId}) error:", (e as Error).message);
  }

  // 5. Reconcile
  console.log(`\n=== Reconciliation (DB opt-ins vs Resend) ===`);
  const missingGlobal: string[] = [];
  const inGlobalNotSegment: string[] = [];
  const fullyPresent: string[] = [];
  for (const r of dbRows) {
    const e = norm(r.email);
    if (!globalEmails.has(e)) missingGlobal.push(r.email);
    else if (segmentEmails.size && !segmentEmails.has(e))
      inGlobalNotSegment.push(r.email);
    else fullyPresent.push(r.email);
  }
  console.log(`In DB & in segment (OK): ${fullyPresent.length}`);
  console.log(
    `In DB, contact exists globally but NOT in segment: ${inGlobalNotSegment.length}`
  );
  if (inGlobalNotSegment.length)
    console.log("   -> " + inGlobalNotSegment.join(", "));
  console.log(`In DB but NO Resend contact at all: ${missingGlobal.length}`);
  if (missingGlobal.length) console.log("   -> " + missingGlobal.join(", "));

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
