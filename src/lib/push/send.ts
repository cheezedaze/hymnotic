import { adminMessaging } from "./admin";
import { getActivePushTokens, deactivatePushTokens } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { devicePushTokens, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

const BATCH = 500; // FCM sendEachForMulticast hard limit

/**
 * Broadcasts a notification to every active device token. A bare `notification`
 * payload opens the app on tap (no deep-link). Tokens that FCM reports as
 * unregistered/invalid are deactivated so they aren't retried.
 */
export async function sendBroadcast({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const rows = await getActivePushTokens();
  return sendToTokens(rows.map((r) => r.token), { title, body });
}

export async function sendUserNotification(email: string, notification: { title: string; body: string }) {
  const rows = await db.select({ token: devicePushTokens.token }).from(devicePushTokens)
    .innerJoin(users, eq(devicePushTokens.userId, users.id))
    .where(and(eq(devicePushTokens.active, true), eq(users.role, "ADMIN"), sql`lower(${users.email}) = ${email.toLowerCase()}`));
  return sendToTokens(rows.map((row) => row.token), notification);
}

async function sendToTokens(tokens: string[], { title, body }: { title: string; body: string }) {
  if (tokens.length === 0) return { sentCount: 0, failedCount: 0 };

  const messaging = adminMessaging();
  let sentCount = 0;
  let failedCount = 0;
  const dead: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH) {
    const chunk = tokens.slice(i, i + BATCH);
    const res = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
    });
    sentCount += res.successCount;
    failedCount += res.failureCount;
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          dead.push(chunk[idx]);
        }
      }
    });
  }

  await deactivatePushTokens(dead);
  return { sentCount, failedCount };
}
