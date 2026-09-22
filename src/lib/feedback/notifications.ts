import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback, type Feedback } from "@/lib/db/schema";
import { sendUserNotification } from "@/lib/push/send";

export async function notifyFeedback(entry: Feedback) {
  const results = await Promise.allSettled([
    (async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "HYMNZ <hello@hymnz.com>",
        to: "hello@hymnz.com",
        replyTo: entry.allowContact && entry.contactEmail ? entry.contactEmail : undefined,
        subject: "New HYMNZ feedback",
        text: `New feedback\n\n${entry.message}\n\nAcknowledgement (${entry.responseSource}):\n${entry.acknowledgement}\n\n${entry.allowContact ? `Follow-up permitted: ${entry.contactEmail}` : "This listener has not agreed to email follow-up."}\n\nView and reply: https://hymnz.com/admin/feedback`,
      }, { idempotencyKey: `feedback-notification/${entry.id}` });
      if (error) throw new Error(error.message);
    })(),
    sendUserNotification("admin@hymnotic.app", { title: "New HYMNZ feedback", body: "A listener shared feedback. Open Engagement → Feedback to read it." }),
  ]);
  const [email, push] = results;
  await db.update(feedback).set({
    emailNotificationStatus: email.status === "fulfilled" ? "sent" : "failed",
    pushNotificationStatus: push.status === "rejected" || push.value.failedCount > 0 ? "failed" : push.value.sentCount > 0 ? "sent" : "unavailable",
  }).where(eq(feedback.id, entry.id));
  for (const result of results) if (result.status === "rejected") console.error("Feedback notification failed:", result.reason);
}
