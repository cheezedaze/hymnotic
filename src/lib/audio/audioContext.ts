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
