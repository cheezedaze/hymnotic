import { androidAssociation } from "@/lib/deep-links/associations";

export function GET() {
  try {
    return Response.json(androidAssociation(process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS), {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return Response.json({ error: "Android App Links are not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
