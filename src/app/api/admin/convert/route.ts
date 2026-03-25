import { NextRequest, NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getMediaUrl } from "@/lib/s3/client";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { convertWavToMp3 } from "@/lib/audio/convertWavToMp3";

// Allow up to 2 minutes for large WAV conversion
export const maxDuration = 120;

function getS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS credentials are not configured. " +
        `AWS_ACCESS_KEY_ID is ${accessKeyId ? "set" : "MISSING"}, ` +
        `AWS_SECRET_ACCESS_KEY is ${secretAccessKey ? "set" : "MISSING"}.`
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

/**
 * POST /api/admin/convert
 * Converts a WAV file already in S3 (audio/originals/) to MP3.
 * Accepts a tiny JSON body — the actual file is fetched from S3 server-side.
 */
export async function POST(request: NextRequest) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { originalKey } = await request.json();

    if (!originalKey || !originalKey.startsWith("audio/originals/")) {
      return NextResponse.json(
        { error: "originalKey is required and must be in audio/originals/" },
        { status: 400 }
      );
    }

    const client = getS3Client();

    // 1. Download WAV from S3
    const getResult = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: originalKey })
    );
    const wavBuffer = Buffer.from(await getResult.Body!.transformToByteArray());

    // 2. Convert WAV to MP3
    let mp3Buffer: Buffer;
    let durationSeconds: number;
    try {
      const result = await convertWavToMp3(wavBuffer);
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

    // 3. Upload MP3 to audio/tracks/
    const baseName = originalKey
      .replace("audio/originals/", "")
      .replace(/\.wav$/i, "");
    const mp3Key = `audio/tracks/${baseName}.mp3`;

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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Convert error:", message, error);
    return NextResponse.json(
      { error: `Conversion failed: ${message}` },
      { status: 500 }
    );
  }
}
