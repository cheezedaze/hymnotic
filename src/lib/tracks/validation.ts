import { mediaExists } from "@/lib/s3/client";

export class TrackReleaseError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function assertTrackAudio(audioKey: string | null | undefined) {
  if (!audioKey || !audioKey.startsWith("audio/tracks/") || /\.wav$/i.test(audioKey)) {
    throw new TrackReleaseError("Upload the track audio and finish WAV conversion before activating or scheduling it.");
  }
  if (!(await mediaExists(audioKey))) {
    throw new TrackReleaseError("The audio file could not be verified. Upload it again before activating or scheduling this track.");
  }
}

export function parseReleaseInput(body: Record<string, unknown>, now = new Date()) {
  const immediate = body.immediate === true;
  const scheduledAt = immediate ? now : new Date(typeof body.scheduledAt === "string" ? body.scheduledAt : "");
  if (!Number.isFinite(scheduledAt.getTime()) || (!immediate && scheduledAt <= now)) {
    throw new TrackReleaseError("Choose a release date and time in the future.");
  }
  const text = (key: string) => typeof body[key] === "string" ? (body[key] as string).trim() : "";
  const announcementTitle = text("announcementTitle");
  const announcementBody = text("announcementBody");
  const pushTitle = text("pushTitle");
  const pushBody = text("pushBody");
  if ((announcementTitle || announcementBody) && (!announcementTitle || !announcementBody.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim())) {
    throw new TrackReleaseError("Add a title and content for the announcement, or turn it off.");
  }
  if ((pushTitle || pushBody) && (!pushTitle || !pushBody)) {
    throw new TrackReleaseError("Add a title and message for the push notification, or turn it off.");
  }
  if (pushTitle.length > 100 || pushBody.length > 500) {
    throw new TrackReleaseError("Use at most 100 characters for the push title and 500 for the message.");
  }
  return {
    scheduledAt,
    announcementTitle: announcementTitle || null,
    announcementBody: announcementBody || null,
    pushTitle: pushTitle || null,
    pushBody: pushBody || null,
  };
}
