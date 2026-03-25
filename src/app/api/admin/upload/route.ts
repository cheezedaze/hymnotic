import { NextRequest, NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getMediaUrl } from "@/lib/s3/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Separate S3 client for uploads to avoid singleton caching issues
function getUploadClient(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS credentials are not configured. " +
        `AWS_ACCESS_KEY_ID is ${accessKeyId ? "set" : "MISSING"}, ` +
        `AWS_SECRET_ACCESS_KEY is ${secretAccessKey ? "set" : "MISSING"}. ` +
        "Check environment variables in your deployment settings."
    );
  }

  return new S3Client({
    region: process.env.AWS_REGION || "us-west-2",
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

const BUCKET = process.env.AWS_S3_BUCKET || "hymnotic-media";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string | null;

    if (!file || !folder) {
      return NextResponse.json(
        { error: "file and folder are required" },
        { status: 400 }
      );
    }

    // Validate folder
    const validFolders = [
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

    if (!validFolders.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Must be one of: ${validFolders.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate unique key parts
    const ext = file.name.split(".").pop() || "";
    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-");
    const timestamp = Date.now();

    const buffer = Buffer.from(await file.arrayBuffer());
    const client = getUploadClient();

    // Direct upload (WAV conversion is handled by /api/admin/convert)
    const key = `${folder}/${baseName}-${timestamp}.${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const cdnUrl = getMediaUrl(key);

    return NextResponse.json({ key, cdnUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isCredentialError =
      message.includes("credential") ||
      message.includes("Credential") ||
      message.includes("InvalidAccessKeyId") ||
      message.includes("SignatureDoesNotMatch") ||
      message.includes("AccessDenied");

    if (isCredentialError) {
      console.error("S3 credential error:", message);
      return NextResponse.json(
        {
          error:
            "Upload failed: AWS credentials are invalid or expired. " +
            "Please verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    console.error("Upload error:", message, error);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
