import TrackOpenGraphImage from "../opengraph-image";

export const runtime = "nodejs";

interface TrackOpenGraphImageRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: TrackOpenGraphImageRouteContext
) {
  return TrackOpenGraphImage({ params: context.params });
}
