import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback, feedbackReplies, users } from "@/lib/db/schema";
import { FALLBACK_ACKNOWLEDGEMENT } from "./acknowledgement";

export class FeedbackError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function createFeedback(input: { id: string; userId: string; message: string; allowContact: boolean }) {
  return db.transaction(async (tx) => {
    // Durable per-account limit, including simultaneous requests on different servers.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 14714))`);
    const [existing] = await tx.select().from(feedback).where(eq(feedback.id, input.id));
    if (existing) {
      if (existing.userId !== input.userId || existing.message !== input.message || existing.allowContact !== input.allowContact) {
        throw new FeedbackError("Please start a new feedback submission.", 409);
      }
      return { entry: existing, created: false };
    }
    const [user] = await tx.select({ email: users.email }).from(users).where(eq(users.id, input.userId));
    if (!user) throw new FeedbackError("Please sign in to send feedback.", 401);
    const [recent] = await tx.select({ total: count() }).from(feedback)
      .where(and(eq(feedback.userId, input.userId), gte(feedback.createdAt, new Date(Date.now() - 60 * 60_000))));
    if (recent.total >= 3) throw new FeedbackError("You've sent several messages recently. Please try again in an hour.", 429);
    const [entry] = await tx.insert(feedback).values({
      ...input, contactEmail: input.allowContact ? user.email : null,
      acknowledgement: FALLBACK_ACKNOWLEDGEMENT,
    }).returning();
    return { entry, created: true };
  });
}

export async function getFeedbackPage(page = 0) {
  const entries = await db.select().from(feedback).orderBy(desc(feedback.createdAt), desc(feedback.id)).limit(21).offset(page * 20);
  const visible = entries.slice(0, 20);
  const replies = visible.length ? await db.select().from(feedbackReplies)
    .where(inArray(feedbackReplies.feedbackId, visible.map((entry) => entry.id))).orderBy(feedbackReplies.createdAt) : [];
  return { entries: visible.map((entry) => ({ ...entry, replies: replies.filter((reply) => reply.feedbackId === entry.id) })), hasMore: entries.length > 20 };
}
