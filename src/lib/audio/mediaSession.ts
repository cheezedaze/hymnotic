import { getAudioElement } from "./audioContext";

export const FALLBACK_ARTWORK_URL =
  "https://www.hymnz.com/images/album-all-tracks.jpg";

export function artworkCandidates(
  trackArtworkUrl: string | null | undefined,
  collectionArtworkUrl: string | null | undefined
): string[] {
  return Array.from(
    new Set(
      [trackArtworkUrl, collectionArtworkUrl, FALLBACK_ARTWORK_URL].filter(
        (url): url is string => Boolean(url)
      )
    )
  );
}

function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

export async function resolveArtworkUrl(
  candidates: string[],
  load: (src: string) => Promise<boolean> = preloadImage
): Promise<string> {
  for (const candidate of candidates) {
    if (await load(candidate)) return candidate;
  }

  return FALLBACK_ARTWORK_URL;
}

/**
 * A Media Session play command can arrive after iOS has paused the underlying
 * element without changing Zustand. Always call play() directly so the command
 * remains effective even when the store already says playback is active.
 */
export function resumeAudioFromRemoteControl(
  markPlaying: () => void,
  markPaused: () => void,
  audio: Pick<HTMLAudioElement, "src" | "play"> | null = getAudioElement()
) {
  markPlaying();

  if (!audio?.src) return;

  audio.play().catch(markPaused);
}

export function pauseAudioFromRemoteControl(
  markPaused: () => void,
  audio: Pick<HTMLAudioElement, "pause"> | null = getAudioElement()
) {
  audio?.pause();
  markPaused();
}
