import { appleAssociation } from "@/lib/deep-links/associations";

export function GET() {
  return Response.json(appleAssociation(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
