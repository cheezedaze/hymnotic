import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 client singleton
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-west-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
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
