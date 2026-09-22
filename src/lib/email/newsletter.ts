import { Resend } from "resend";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, asc, count, eq, gt } from "drizzle-orm";

export class NewsletterSyncError extends Error {}

function configuration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const segmentId = process.env.RESEND_SEGMENT_ID?.trim() || process.env.RESEND_AUDIENCE_ID?.trim();
  if (!apiKey) throw new NewsletterSyncError("Configure RESEND_API_KEY on the server.");
  if (!segmentId) throw new NewsletterSyncError("Configure RESEND_SEGMENT_ID on the server with the HYMNZ Newsletter segment ID.");
  return { resend: new Resend(apiKey), segmentId };
}

type ApiResult<T> = { data: T | null; error: { message: string; name: string; statusCode: number | null } | null; headers?: Record<string, string> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Pace reconciliation and retry transient failures to respect Resend's limits.
async function request<T>(operation: () => Promise<ApiResult<T>>, allowMissing = false): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    await wait(600);
    const result = await operation();
    if (!result.error) return result.data;
    const { statusCode, name, message } = result.error;
    if (allowMissing && statusCode === 404) return null;
    if (attempt < 3 && (statusCode === 429 || (statusCode !== null && statusCode >= 500))) {
      const retryAfter = Number(result.headers?.["retry-after"]);
      await wait(Math.min(10_000, Math.max(1000 * 2 ** attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : 0)));
      continue;
    }
    if (statusCode === 401 || statusCode === 403) {
      throw new NewsletterSyncError("Resend rejected access. Check that RESEND_API_KEY is valid and has full access to Contacts and Segments.");
    }
    throw new NewsletterSyncError(`Resend: ${message} (${name})`);
  }
}

async function syncContact(resend: Resend, segmentId: string, email: string, firstName: string | undefined, explicitOptIn: boolean) {
  const contact = await request(() => resend.contacts.get({ email }), true);
  if (!contact) {
    await request(() => resend.contacts.create({ email, firstName, unsubscribed: false, segments: [{ id: segmentId }] }));
    return "synced";
  }
  // A campaign unsubscribe can be newer than the DB preference. Only a fresh,
  // explicit opt-in may resubscribe someone; a bulk repair must preserve it.
  if (contact.unsubscribed && !explicitOptIn) return "unsubscribed";
  if (explicitOptIn) {
    await request(() => resend.contacts.update({ id: contact.id, firstName, unsubscribed: false }));
  }
  await request(() => resend.contacts.segments.add({ contactId: contact.id, segmentId }));
  return "synced";
}

export async function addContactToNewsletter(email: string, firstName?: string) {
  const { resend, segmentId } = configuration();
  await syncContact(resend, segmentId, email, firstName, true);
}

// Small, resumable pages keep the admin action within serverless request limits.
export async function syncAllNewsletterContacts(after?: string) {
  const startedAt = Date.now();
  const { resend, segmentId } = configuration();
  await request(() => resend.segments.get(segmentId));
  const [totals, rows] = await Promise.all([
    db.select({ total: count() }).from(users).where(eq(users.newsletterOptIn, true)),
    db.select({ id: users.id, email: users.email, name: users.name }).from(users)
      .where(and(eq(users.newsletterOptIn, true), after ? gt(users.id, after) : undefined))
      .orderBy(asc(users.id)).limit(11),
  ]);
  const page = rows.slice(0, 10);
  let synced = 0;
  let skippedUnsubscribed = 0;
  let processed = 0;
  const failed: { email: string; error: string }[] = [];
  for (const user of page) {
    if (processed > 0 && Date.now() - startedAt >= 45_000) break;
    try {
      const status = await syncContact(resend, segmentId, user.email, user.name ?? undefined, false);
      if (status === "unsubscribed") skippedUnsubscribed++;
      else synced++;
    } catch (error) {
      failed.push({ email: user.email, error: error instanceof NewsletterSyncError ? error.message : "Contact sync failed. Please retry." });
    }
    processed++;
  }
  return { total: totals[0].total, synced, skippedUnsubscribed, failed, nextCursor: rows.length > processed && processed > 0 ? page[processed - 1].id : null };
}

export async function removeContactFromNewsletter(email: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new NewsletterSyncError("Configure RESEND_API_KEY on the server.");
  const resend = new Resend(apiKey);
  const contact = await request(() => resend.contacts.get({ email }), true);
  if (contact) await request(() => resend.contacts.update({ id: contact.id, unsubscribed: true }));
}
