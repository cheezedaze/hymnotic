import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { invitations, users } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find valid invitation
    const result = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          isNull(invitations.usedAt),
          gt(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    const invitation = result[0];
    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitation.email.toLowerCase()))
      .limit(1);

    if (existingUser[0]) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email: invitation.email.toLowerCase(),
      name: name || null,
      passwordHash,
      role: "USER",
    });

    // Mark invitation as used
    await db
      .update(invitations)
      .set({ usedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
