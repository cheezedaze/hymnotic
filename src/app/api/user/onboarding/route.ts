import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { users, onboardingResponses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const REPROMPT_DAYS = 7;
const MAX_FIELD_LEN = 2000;

const ALLOWED_SOURCES = new Set([
  "friend",
  "search",
  "social",
  "podcast",
  "church",
  "appstore",
  "other",
]);

function clean(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FIELD_LEN);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select({
      onboardingCompletedAt: users.onboardingCompletedAt,
      onboardingLastDismissedAt: users.onboardingLastDismissedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const row = result[0];
  if (!row) {
    return NextResponse.json({ shouldShow: false, completed: false });
  }

  const completed = row.onboardingCompletedAt !== null;
  let shouldShow = false;
  if (!completed) {
    if (!row.onboardingLastDismissedAt) {
      shouldShow = true;
    } else {
      const ageMs = Date.now() - row.onboardingLastDismissedAt.getTime();
      shouldShow = ageMs > REPROMPT_DAYS * 24 * 60 * 60 * 1000;
    }
  }

  return NextResponse.json({ shouldShow, completed });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = (body as { action?: unknown }).action;

  if (action === "dismiss") {
    await db
      .update(users)
      .set({
        onboardingLastDismissedAt: new Date(),
        onboardingDismissCount: sql`${users.onboardingDismissCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ ok: true });
  }

  if (action === "complete") {
    const referralSourceRaw = clean(
      (body as { referralSource?: unknown }).referralSource
    );
    const referralSource =
      referralSourceRaw && ALLOWED_SOURCES.has(referralSourceRaw)
        ? referralSourceRaw
        : null;
    const referralDetail = clean(
      (body as { referralDetail?: unknown }).referralDetail
    );
    const favoriteMusic = clean(
      (body as { favoriteMusic?: unknown }).favoriteMusic
    );
    const favoriteHymns = clean(
      (body as { favoriteHymns?: unknown }).favoriteHymns
    );

    const now = new Date();

    await db
      .insert(onboardingResponses)
      .values({
        userId: session.user.id,
        referralSource,
        referralDetail,
        favoriteMusic,
        favoriteHymns,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: onboardingResponses.userId,
        set: {
          referralSource,
          referralDetail,
          favoriteMusic,
          favoriteHymns,
          completedAt: now,
          updatedAt: now,
        },
      });

    await db
      .update(users)
      .set({ onboardingCompletedAt: now, updatedAt: now })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
