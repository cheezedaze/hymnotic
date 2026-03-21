import { NextRequest, NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getPresignedUploadUrl, getMediaUrl } from "@/lib/s3/client";

const VALID_FOLDERS = [
  "audio/tracks",
  "audio/previews",
  "audio/originals",
  "audio/system",
  "images/artwork",
  "images/artists",
  "images/misc",
  "video/tracks",
  "video/thumbnails",
];

export async function POST(request: NextRequest) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { fileName, contentType, folder } = await request.json();

    if (!fileName || !contentType || !folder) {
      return NextResponse.json(
        { error: "fileName, contentType, and folder are required" },
        { status: 400 }
      );
    }

    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const ext = fileName.split(".").pop() || "";
    const baseName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-");
    const timestamp = Date.now();
    const key = `${folder}/${baseName}-${timestamp}.${ext}`;

    const url = await getPresignedUploadUrl(key, contentType);
    const cdnUrl = getMediaUrl(key);

    return NextResponse.json({ url, key, cdnUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Presign error:", message);
    return NextResponse.json(
      { error: `Failed to generate presigned URL: ${message}` },
      { status: 500 }
    );
  }
}
