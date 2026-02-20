import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getAllVideos, createVideo } from "@/lib/db/queries";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const videos = await getAllVideos();
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { title, youtubeUrl, thumbnailUrl, trackId, sortOrder } = body;

    if (!title || !youtubeUrl) {
      return NextResponse.json(
        { error: "title and youtubeUrl are required" },
        { status: 400 }
      );
    }

    const video = await createVideo({
      title,
      youtubeUrl,
      thumbnailUrl: thumbnailUrl ?? undefined,
      trackId: trackId ?? undefined,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}
