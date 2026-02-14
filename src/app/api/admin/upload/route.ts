import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getPresignedUploadUrl, getMediaUrl } from "@/lib/s3/client";

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { fileName, contentType, folder } = await request.json();

    if (!fileName || !contentType || !folder) {
      return NextResponse.json(
        { error: "fileName, contentType, and folder are required" },
        { status: 400 }
      );
    }

    // Validate folder
    const validFolders = [
      "audio/tracks",
      "audio/previews",
      "images/artwork",
      "images/artists",
      "images/misc",
      "video/tracks",
      "video/thumbnails",
    ];

    if (!validFolders.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Must be one of: ${validFolders.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate unique key: folder/filename-timestamp.ext
    const ext = fileName.split(".").pop() || "";
    const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
    const key = `${folder}/${baseName}-${Date.now()}.${ext}`;

    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const cdnUrl = getMediaUrl(key);

    return NextResponse.json({ uploadUrl, key, cdnUrl });
  } catch (error) {
    console.error("Upload presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
