import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { sendBroadcast } from "@/lib/push/send";
import { logPushNotification, getPushHistory } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getPushHistory());
}

export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { title, body } = await request.json();
    if (!title || !body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }
    const { sentCount, failedCount } = await sendBroadcast({ title, body });
    await logPushNotification({ title, body, sentCount, failedCount });
    return NextResponse.json({ sentCount, failedCount });
  } catch (error) {
    console.error("Error sending push:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
