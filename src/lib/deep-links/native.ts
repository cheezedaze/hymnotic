import type { AppPlugin } from "@capacitor/app";
import { parseTrackLink } from "./urls";

export function connectTrackLinks(
  app: Pick<AppPlugin, "addListener" | "getLaunchUrl">,
  navigate: (path: string) => void,
) {
  let cancelled = false;
  let remove: (() => Promise<void>) | undefined;
  let receivedEvent = false;
  let pendingPath: string | null = null;
  let pendingAt = 0;
  const open = (url: string) => {
    const path = parseTrackLink(url);
    if (cancelled || !path) return;
    // Scene/App delegates can both deliver the same event before navigation commits.
    if (path === pendingPath && Date.now() - pendingAt < 1000) return;
    pendingPath = path; pendingAt = Date.now();
    navigate(path);
  };
  void (async () => {
    const listener = await app.addListener("appUrlOpen", ({ url }) => {
      receivedEvent = true;
      open(url);
    });
    if (cancelled) { await listener.remove(); return; }
    remove = () => listener.remove();
    const launch = await app.getLaunchUrl();
    // A newer warm-start event wins over a stale cold-start URL.
    if (launch?.url && !receivedEvent) open(launch.url);
  })().catch(() => console.warn("HYMNZ could not initialize app links."));
  return () => { cancelled = true; void remove?.(); };
}
