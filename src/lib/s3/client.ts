import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";

// S3 client singleton
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
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

    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-west-2",
      credentials: { accessKeyId, secretAccessKey },
      // Force virtual-hosted style URLs (bucket.s3.region.amazonaws.com)
      forcePathStyle: false,
      // Disable automatic checksums — SDK v3.990+ adds CRC32 by default,
      // which causes CORS preflight failures on browser-to-S3 uploads.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return s3Client;
}

const BUCKET = process.env.AWS_S3_BUCKET || "hymnotic-media";

/**
 * Get the CDN URL for a media file.
 * Uses CloudFront if configured, falls back to direct S3 URL.
 */
export function getMediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl) {
    return `${cdnUrl}/${key}`;
  }

  // Fallback to direct S3 URL
  const region = process.env.AWS_REGION || "us-west-2";
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

// How long an audio signed URL stays valid. Long enough to outlive any single
// listen + seeking session (no mid-song 403), short enough that a scraped
// redirect URL dies within the day.
const SIGNED_URL_TTL_SEC = 21600; // 6 hours

/**
 * Sign a CloudFront URL for a track-audio key so it can be fetched from the
 * (now access-restricted) `audio/tracks/*` path. Falls back to an unsigned CDN
 * URL when signing keys aren't configured (local dev) so playback still works.
 */
export function signAudioUrl(
  key: string | null | undefined,
  ttlSec: number = SIGNED_URL_TTL_SEC
): string | null {
  const base = getMediaUrl(key);
  if (!base) return null;

  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  const privateKeyRaw = process.env.CLOUDFRONT_PRIVATE_KEY;
  if (!keyPairId || !privateKeyRaw) {
    // Unconfigured (local dev): return the unsigned URL. In prod the keys exist.
    return base;
  }
  // Env stores the PEM with literal "\n"; restore real newlines.
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return getCloudFrontSignedUrl({
    url: base,
    keyPairId,
    privateKey,
    dateLessThan: new Date(Date.now() + ttlSec * 1000).toISOString(),
  });
}

/**
 * Fetch a byte range of an S3 object. Used to stream a capped audio preview
 * so non-paying tiers can never pull the full file through the app.
 * Returns the bytes plus the object's true total size (from Content-Range).
 */
export async function getObjectRange(
  key: string,
  start: number,
  endInclusive: number
): Promise<{ bytes: Uint8Array<ArrayBuffer>; total: number }> {
  const client = getS3Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Range: `bytes=${start}-${endInclusive}`,
    })
  );
  const raw = await res.Body!.transformToByteArray();
  // Copy into a fresh ArrayBuffer-backed view so it satisfies BodyInit.
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(raw);
  // Content-Range looks like "bytes 0-1599999/3456789"; grab the total.
  const total = res.ContentRange
    ? parseInt(res.ContentRange.split("/")[1] ?? "", 10)
    : bytes.length;
  return { bytes, total: Number.isFinite(total) ? total : bytes.length };
}

/**
 * Generate a presigned URL for private media access.
 * Use for content that shouldn't be publicly cacheable.
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Build media URLs for a track from its S3 keys.
 * This is the main function used by API routes.
 */
export function buildTrackMediaUrls(track: {
  artworkKey: string | null;
  audioKey: string | null;
  videoKey: string | null;
  videoThumbnailKey: string | null;
  originalAudioKey?: string | null;
}) {
  return {
    artworkUrl: getMediaUrl(track.artworkKey),
    audioUrl: getMediaUrl(track.audioKey),
    videoUrl: getMediaUrl(track.videoKey),
    videoThumbnailUrl: getMediaUrl(track.videoThumbnailKey),
    originalAudioUrl: getMediaUrl(track.originalAudioKey),
  };
}

/**
 * Build media URLs for a track, including the parent collection's artwork as fallback.
 */
export function buildTrackMediaUrlsWithFallback(
  track: {
    artworkKey: string | null;
    audioKey: string | null;
    videoKey: string | null;
    videoThumbnailKey: string | null;
    originalAudioKey?: string | null;
  },
  collectionArtworkKey: string | null
) {
  return {
    ...buildTrackMediaUrls(track),
    collectionArtworkUrl: getMediaUrl(collectionArtworkKey),
  };
}

/**
 * Build media URL for a collection's artwork.
 */
export function buildCollectionMediaUrls(collection: {
  artworkKey: string | null;
}) {
  return {
    artworkUrl: getMediaUrl(collection.artworkKey),
  };
}

/**
 * Generate a presigned PUT URL for browser-to-S3 uploads.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a media file from S3.
 */
export async function deleteMedia(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
