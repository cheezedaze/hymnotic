import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  addContactToNewsletter,
  removeContactFromNewsletter,
} from "@/lib/email/newsletter";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select({ newsletterOptIn: users.newsletterOptIn })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    newsletterOptIn: result[0]?.newsletterOptIn ?? false,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newsletterOptIn } = await request.json();
  if (typeof newsletterOptIn !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ newsletterOptIn, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  // Sync with Resend Audience (non-blocking)
  try {
    if (newsletterOptIn) {
      await addContactToNewsletter(
        session.user.email!,
        session.user.name ?? undefined
      );
    } else {
      await removeContactFromNewsletter(session.user.email!);
    }
  } catch (err) {
    console.error("Failed to sync newsletter preference with Resend:", err);
  }

  return NextResponse.json({ newsletterOptIn });
}
