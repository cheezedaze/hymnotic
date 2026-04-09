import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    const checkoutSession =
      await getStripe().checkout.sessions.retrieve(sessionId);

    if (
      checkoutSession.status !== "complete" ||
      checkoutSession.payment_status !== "paid"
    ) {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Verify this session belongs to the current user
    const userId = checkoutSession.metadata?.userId;
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "Session mismatch" },
        { status: 403 }
      );
    }

    // Update user to premium (same as webhook handler)
    await db
      .update(users)
      .set({
        isPremium: true,
        accountTier: "paid",
        subscriptionStatus: "active",
        stripeCustomerId: checkoutSession.customer as string,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify session error:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}
