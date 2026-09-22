import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { feedback, feedbackReplies } from "@/lib/db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuthAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.body !== "string" || !body.body.trim() || body.body.length > 5000 ||
    typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: "Enter a reply of 1–5,000 characters." }, { status: 400 });
  }
  try {
    const [entry] = await db.select().from(feedback).where(eq(feedback.id, id));
    if (!entry) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    if (!entry.allowContact || !entry.contactEmail) return NextResponse.json({ error: "This listener has not agreed to email follow-up." }, { status: 403 });
    if (!process.env.RESEND_API_KEY?.trim()) return NextResponse.json({ error: "Email is not configured." }, { status: 503 });
    await db.insert(feedbackReplies).values({ id: body.id, feedbackId: id, body: body.body.trim() }).onConflictDoNothing();
    const [reply] = await db.select().from(feedbackReplies).where(eq(feedbackReplies.id, body.id));
    if (reply.feedbackId !== id || reply.body !== body.body.trim()) return NextResponse.json({ error: "This reply attempt already exists with different text. Start a new reply." }, { status: 409 });
    if (reply.emailId) return NextResponse.json(reply);
    // Resend remembers idempotency keys for 24 hours. Never retry an uncertain
    // send after that window; it could deliver the same reply twice.
    if (Date.now() - reply.createdAt.getTime() >= 23 * 60 * 60_000) {
      return NextResponse.json({ error: "This attempt is too old to retry safely. Check Resend delivery history before starting a new reply." }, { status: 409 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "HYMNZ <hello@hymnz.com>", to: entry.contactEmail,
      replyTo: "hello@hymnz.com", subject: "Re: Your HYMNZ feedback",
      text: `${reply.body}\n\n— HYMNZ\n\nYour feedback:\n${entry.message}`,
    }, { idempotencyKey: `feedback-reply/${reply.id}` });
    if (error || !data) return NextResponse.json({ error: "Email delivery could not be confirmed. Retry this saved reply." }, { status: 502 });
    const [sent] = await db.update(feedbackReplies).set({ emailId: data.id }).where(eq(feedbackReplies.id, reply.id)).returning();
    return NextResponse.json(sent);
  } catch (error) {
    console.error("Feedback reply failed:", error);
    return NextResponse.json({ error: "Email delivery could not be confirmed. Retry this saved reply." }, { status: 500 });
  }
}
