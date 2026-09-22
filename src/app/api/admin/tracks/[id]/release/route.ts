import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { cancelTrackRelease, getTrackRelease, processTrackRelease, scheduleTrackRelease } from "@/lib/tracks/releases";
import { TrackReleaseError } from "@/lib/tracks/validation";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ id: string }> };

function failure(error: unknown) {
  console.error("Track release error:", error);
  return NextResponse.json({ error: error instanceof TrackReleaseError ? error.message : "Could not update the release. Refresh to check its status before trying again." },
    { status: error instanceof TrackReleaseError ? error.status : 500 });
}

export async function GET(_request: Request, { params }: Context) {
  if (!(await requireAuthAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getTrackRelease((await params).id));
}

export async function POST(request: Request, { params }: Context) {
  if (!(await requireAuthAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const release = await scheduleTrackRelease(id, body);
    return NextResponse.json(body.immediate === true ? await processTrackRelease(id) : release);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await requireAuthAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await cancelTrackRelease((await params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
