import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getUserFavoriteIds,
  addUserFavorite,
  removeUserFavorite,
} from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only paid users have favorites
  if (!session.user.isPremium) {
    return NextResponse.json({ trackIds: [] });
  }

  const trackIds = await getUserFavoriteIds(session.user.id);
  return NextResponse.json({ trackIds });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isPremium) {
    return NextResponse.json(
      { error: "Favorites require a premium subscription" },
      { status: 403 }
    );
  }

  const { trackId } = await request.json();
  if (!trackId) {
    return NextResponse.json(
      { error: "trackId is required" },
      { status: 400 }
    );
  }

  await addUserFavorite(session.user.id, trackId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isPremium) {
    return NextResponse.json(
      { error: "Favorites require a premium subscription" },
      { status: 403 }
    );
  }

  const { trackId } = await request.json();
  if (!trackId) {
    return NextResponse.json(
      { error: "trackId is required" },
      { status: 400 }
    );
  }

  await removeUserFavorite(session.user.id, trackId);
  return NextResponse.json({ success: true });
}
