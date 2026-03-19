/**
 * Separate singleton for voiceover audio playback.
 * This must be a different element from the main audio
 * since voiceover plays after the main audio is paused.
 */

let voiceoverElement: HTMLAudioElement | null = null;

function getOrCreateVoiceoverElement(): HTMLAudioElement {
  if (!voiceoverElement) {
    voiceoverElement = new Audio();
  }
  return voiceoverElement;
}

/**
 * Play a voiceover audio file and return a promise that resolves when it ends.
 */
export function playVoiceover(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = getOrCreateVoiceoverElement();
    audio.src = url;
    audio.volume = 1;
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export function stopVoiceover(): void {
  if (voiceoverElement) {
    voiceoverElement.pause();
    voiceoverElement.removeAttribute("src");
  }
}
