export type PresignedUploadResult = {
  key: string;
  cdnUrl: string;
};

/** Upload directly to S3 via presigned URL (bypasses Vercel's 4.5MB body limit) */
export async function uploadViaPresignedUrl(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void
): Promise<PresignedUploadResult> {
  // 1. Get presigned URL from our API (tiny JSON request)
  const res = await fetch("/api/admin/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      folder,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to get upload URL (${res.status})`);
  }

  const { url, key, cdnUrl } = await res.json();

  // 2. PUT file directly to S3 with progress tracking
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  return { key, cdnUrl };
}
