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

    const startTime = performance.now();
    const delta = to - from;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      audio.volume = Math.max(0, Math.min(1, from + delta * progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        audio.volume = Math.max(0, Math.min(1, to));
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}
