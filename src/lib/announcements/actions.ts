export interface AnnouncementAction {
  actionType: "track" | "link" | null;
  actionTrackId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
}

export const noAnnouncementAction: AnnouncementAction = {
  actionType: null, actionTrackId: null, actionUrl: null, actionLabel: null,
};

export class AnnouncementActionError extends Error {}

/** Allow ordinary HTTPS destinations and local routes, never executable URLs. */
export function isAnnouncementUrl(value: string): boolean {
  if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value, "https://www.hymnz.com");
    if (url.username || url.password) return false;
    return value.startsWith("/")
      ? !value.startsWith("//") && url.origin === "https://www.hymnz.com"
      : value.startsWith("https://") && url.protocol === "https:";
  } catch { return false; }
}

export function parseAnnouncementAction(body: Record<string, unknown>): AnnouncementAction {
  if (body.actionType === null || body.actionType === "" || body.actionType === undefined) {
    return { ...noAnnouncementAction };
  }
  if (body.actionType === "track") {
    const id = typeof body.actionTrackId === "string" ? body.actionTrackId.trim() : "";
    if (!id || id.length > 128 || /[/\\\u0000-\u001f\u007f]/.test(id)) {
      throw new AnnouncementActionError("Choose a track for the announcement.");
    }
    return { ...noAnnouncementAction, actionType: "track", actionTrackId: id };
  }
  if (body.actionType === "link") {
    const url = typeof body.actionUrl === "string" ? body.actionUrl.trim() : "";
    const label = typeof body.actionLabel === "string" ? body.actionLabel.trim() : "";
    if (url.length > 2048 || !isAnnouncementUrl(url)) {
      throw new AnnouncementActionError("Enter an HTTPS URL or a local path such as /about.");
    }
    if (!label || label.length > 60) throw new AnnouncementActionError("Enter button text of 1–60 characters.");
    return { ...noAnnouncementAction, actionType: "link", actionUrl: url, actionLabel: label };
  }
  throw new AnnouncementActionError("Choose no button, a track, or a link.");
}
