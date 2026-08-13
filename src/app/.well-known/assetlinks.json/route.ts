import { buildAndroidAssetLinks } from "@/lib/deep-links/associations";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export function GET() {
  try {
    const body = buildAndroidAssetLinks(
      process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS
    );

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Android App Links are not configured" }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
