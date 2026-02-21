import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

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

    return NextResponse.json({ email: invitation.email });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}
