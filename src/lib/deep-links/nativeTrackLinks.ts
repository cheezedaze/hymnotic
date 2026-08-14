export interface NativeLinkApp {
  getLaunchUrl(): Promise<{ url: string } | undefined>;
  addListener(
    eventName: "appUrlOpen",
    listener: (event: { url: string }) => void
  ): Promise<{ remove(): Promise<void> }>;
}

export interface NativeLinkNavigation {
  currentPath(): string;
  push(path: string): void;
}

const TRACK_PATH = /^\/track\/[^/]+$/;

export function parseNativeTrackLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "www.hymnz.com" ||
      url.port !== "" ||
      !TRACK_PATH.test(url.pathname)
    ) {
      return null;
    }

    const encodedSegment = url.pathname.slice("/track/".length);
    const decodedSegment = decodeURIComponent(encodedSegment);
    if (/[\u0000-\u001f\u007f]/.test(decodedSegment)) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}

export async function registerNativeTrackLinks(
  app: NativeLinkApp,
  navigation: NativeLinkNavigation
): Promise<() => Promise<void>> {
  const handle = (url: string) => {
    const path = parseNativeTrackLink(url);
    if (path && path !== navigation.currentPath()) {
      navigation.push(path);
    }
  };

  const launchUrl = await app.getLaunchUrl();
  if (launchUrl) {
    handle(launchUrl.url);
  }

  const listener = await app.addListener("appUrlOpen", (event) => {
    handle(event.url);
  });

  return async () => {
    await listener.remove();
  };
}
