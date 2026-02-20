export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimePrecise(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
  return `${mins}:${paddedSecs}`;
}

export function parseTimeInput(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(timeStr) || 0;
}
