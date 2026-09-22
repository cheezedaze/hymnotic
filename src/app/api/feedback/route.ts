import { after, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { acknowledgeFeedback } from "@/lib/feedback/acknowledgement";
import { createFeedback, FeedbackError } from "@/lib/feedback/queries";
import { notifyFeedback } from "@/lib/feedback/notifications";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to send feedback." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string" || !body.message.trim() || body.message.length > 3000 ||
    typeof body.allowContact !== "boolean" || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: "Enter feedback of 1–3,000 characters." }, { status: 400 });
  }
  try {
    const result = await createFeedback({ id: body.id, userId: session.user.id, message: body.message.trim(), allowContact: body.allowContact });
    let entry = result.entry;
    if (result.created) {
      after(async () => {
        try {
          const [saved] = await db.select().from(feedback).where(eq(feedback.id, result.entry.id));
          if (saved) await notifyFeedback(saved);
        } catch (error) { console.error("Feedback notification failed:", error); }
      });
      const response = await acknowledgeFeedback(entry.message);
      [entry] = await db.update(feedback).set(response).where(eq(feedback.id, entry.id)).returning();
    }
    return NextResponse.json({ id: entry.id, acknowledgement: entry.acknowledgement, responseSource: entry.responseSource }, { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FeedbackError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Feedback submission failed:", error);
    return NextResponse.json({ error: "Your submission could not be confirmed. Please try again." }, { status: 500 });
  }
}
