import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { invitations, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { sendInvitationEmail } from "@/lib/email/resend";

export async function GET() {
  const session = await requireAuthAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allInvitations = await db
    .select()
    .from(invitations)
    .orderBy(desc(invitations.createdAt));

  return NextResponse.json(allInvitations);
}

export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser[0]) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const result = await db
      .insert(invitations)
      .values({
        email: normalizedEmail,
        token,
        expiresAt,
        invitedById: session.user?.id,
      })
      .returning();

    // Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";
    const inviteUrl = `${appUrl}/auth/accept-invite?token=${token}`;

    let emailSent = true;
    let emailErrorMessage: string | null = null;
    try {
      await sendInvitationEmail(
        normalizedEmail,
        inviteUrl,
        session.user?.name || undefined
      );
    } catch (err) {
      emailSent = false;
      emailErrorMessage =
        err instanceof Error ? err.message : "Unknown email error";
      console.error("Failed to send invitation email:", err);
    }

    return NextResponse.json({
      ...result[0],
      emailSent,
      emailError: emailErrorMessage,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
