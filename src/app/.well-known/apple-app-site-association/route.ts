import { buildAppleAppSiteAssociation } from "@/lib/deep-links/associations";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export function GET() {
  return new Response(JSON.stringify(buildAppleAppSiteAssociation()), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
