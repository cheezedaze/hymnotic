/**
 * Module-level singleton for the shared HTMLAudioElement.
 *
 * This is the SINGLE source of truth for the audio element used across
 * the entire app. Using a module-level variable (instead of a React ref)
 * ensures that even if components remount, the same audio element is
 * reused and orphaned playback never occurs.
 */

let audioElement: HTMLAudioElement | null = null;

/**
 * Get the singleton audio element, creating it if it doesn't exist.
 * Always use this instead of `new Audio()` elsewhere in the app.
 */
export function getOrCreateAudioElement(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio();
  }
  return audioElement;
}

export function getAudioElement(): HTMLAudioElement | null {
  return audioElement;
}

/**
 * Seek the shared audio element to a specific time (in seconds).
 */
export function seekAudio(time: number) {
  if (audioElement) {
    audioElement.currentTime = time;
  }
}

/**
 * Stop and reset the audio element. Call before loading a new track
 * to ensure no orphaned playback continues.
 */
export function stopAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load(); // reset the element
  }
}

/**
 * Smoothly fade the audio volume from `from` to `to` over `durationMs`.
 * Resolves when the fade is complete.
 *
 * Uses setInterval instead of requestAnimationFrame so the fade continues
 * when the browser tab is in the background or the phone screen is off
 * (rAF is suspended in those cases). A hard setTimeout guarantees the
 * fade resolves even if intervals are heavily throttled.
 */
export function fadeAudioVolume(
  from: number,
  to: number,
  durationMs: number
): Promise<void> {
  return new Promise((resolve) => {
    if (!audioElement) {
      resolve();
      return;
    }

    const audio = audioElement;
    audio.volume = from;

    const startTime = Date.now();
    const delta = to - from;
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      clearInterval(ticker);
      audio.volume = Math.max(0, Math.min(1, to));
      resolve();
    };

    const ticker = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      audio.volume = Math.max(0, Math.min(1, from + delta * progress));
      if (progress >= 1) finish();
    }, 50);

    // Hard guarantee: resolve after durationMs even if intervals are throttled
    setTimeout(finish, durationMs + 100);
  });
}
