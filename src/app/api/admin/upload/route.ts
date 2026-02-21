import { NextRequest, NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getMediaUrl } from "@/lib/s3/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { convertWavToMp3 } from "@/lib/audio/convertWavToMp3";

// Separate S3 client for uploads to avoid singleton caching issues
function getUploadClient(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "us-west-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

const BUCKET = process.env.AWS_S3_BUCKET || "hymnotic-media";

// App Router uses formData() directly — no bodyParser config needed.
// For large uploads, set the max size via route segment config:
export const maxDuration = 60;

function isWavFile(fileName: string, mimeType: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return (
    ext === "wav" ||
    mimeType === "audio/wav" ||
    mimeType === "audio/x-wav" ||
    mimeType === "audio/vnd.wave"
  );
}

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

    // WAV-to-MP3 conversion: when uploading a WAV to audio/tracks,
    // store the original WAV in audio/originals/ and convert to MP3
    if (isWavFile(file.name, file.type) && folder === "audio/tracks") {
      // 1. Upload original WAV to audio/originals/
      const originalKey = `audio/originals/${baseName}-${timestamp}.wav`;
      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: originalKey,
          Body: buffer,
          ContentType: "audio/wav",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      // 2. Convert WAV to MP3
      let mp3Buffer: Buffer;
      let durationSeconds: number;
      try {
        const result = await convertWavToMp3(buffer);
        mp3Buffer = result.mp3Buffer;
        durationSeconds = result.durationSeconds;
      } catch (conversionError) {
        console.error("WAV-to-MP3 conversion failed:", conversionError);
        return NextResponse.json(
          {
            error:
              "WAV uploaded but MP3 conversion failed. The original WAV has been saved.",
            originalKey,
            conversionFailed: true,
          },
          { status: 207 }
        );
      }

      // 3. Upload converted MP3 to audio/tracks/
      const mp3Key = `audio/tracks/${baseName}-${timestamp}.mp3`;
      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: mp3Key,
          Body: mp3Buffer,
          ContentType: "audio/mpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      const cdnUrl = getMediaUrl(mp3Key);

      return NextResponse.json({
        key: mp3Key,
        cdnUrl,
        originalKey,
        converted: true,
        duration: durationSeconds,
      });
    }

    // Non-WAV path: upload directly as before
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
    console.error("Upload error:", message, error);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
