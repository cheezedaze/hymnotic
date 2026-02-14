export interface LyricLine {
  startTime: number;
  endTime: number;
  text: string;
  isChorus?: boolean;
}

export interface TrackLyrics {
  trackId: string;
  lines: LyricLine[];
}

export const lyrics: TrackLyrics[] = [
  {
    trackId: "sands-01",
    lines: [
      { startTime: 0, endTime: 12, text: "Brightly beams our Father\u2019s mercy" },
      { startTime: 12, endTime: 22, text: "From his lighthouse evermore," },
      { startTime: 22, endTime: 32, text: "But to us he gives the keeping" },
      { startTime: 32, endTime: 42, text: "Of the lights along the shore." },
      { startTime: 42, endTime: 55, text: "Let the lower lights be burning;", isChorus: true },
      { startTime: 55, endTime: 65, text: "Send a gleam across the wave.", isChorus: true },
      { startTime: 65, endTime: 78, text: "Some poor fainting, struggling seaman", isChorus: true },
      { startTime: 78, endTime: 90, text: "You may rescue, you may save.", isChorus: true },
      { startTime: 90, endTime: 102, text: "Dark the night of sin has settled;" },
      { startTime: 102, endTime: 112, text: "Loud the angry billows roar." },
      { startTime: 112, endTime: 124, text: "Eager eyes are watching, longing," },
      { startTime: 124, endTime: 136, text: "For the lights along the shore." },
      { startTime: 136, endTime: 149, text: "Let the lower lights be burning;", isChorus: true },
      { startTime: 149, endTime: 159, text: "Send a gleam across the wave.", isChorus: true },
      { startTime: 159, endTime: 172, text: "Some poor fainting, struggling seaman", isChorus: true },
      { startTime: 172, endTime: 185, text: "You may rescue, you may save.", isChorus: true },
      { startTime: 185, endTime: 197, text: "Trim your feeble lamp, my brother;" },
      { startTime: 197, endTime: 207, text: "Some poor sailor, tempest-tossed," },
      { startTime: 207, endTime: 215, text: "Trying now to make the harbor," },
    ],
  },
  {
    trackId: "sands-02",
    lines: [
      { startTime: 0, endTime: 14, text: "When peace like a river attendeth my way," },
      { startTime: 14, endTime: 28, text: "When sorrows like sea billows roll\u2014" },
      { startTime: 28, endTime: 42, text: "Whatever my lot, thou hast taught me to say," },
      { startTime: 42, endTime: 56, text: "It is well, it is well with my soul." },
      { startTime: 56, endTime: 70, text: "It is well with my soul;", isChorus: true },
      { startTime: 70, endTime: 84, text: "It is well, it is well with my soul.", isChorus: true },
      { startTime: 84, endTime: 98, text: "Though Satan should buffet, though trials should come," },
      { startTime: 98, endTime: 112, text: "Let this blest assurance control:" },
      { startTime: 112, endTime: 126, text: "That Christ hath regarded my helpless estate," },
      { startTime: 126, endTime: 140, text: "And hath shed his own blood for my soul." },
      { startTime: 140, endTime: 154, text: "It is well with my soul;", isChorus: true },
      { startTime: 154, endTime: 168, text: "It is well, it is well with my soul.", isChorus: true },
      { startTime: 168, endTime: 182, text: "My sin\u2014oh, the bliss of this glorious thought\u2014" },
      { startTime: 182, endTime: 196, text: "My sin, not in part, but the whole," },
      { startTime: 196, endTime: 210, text: "Is nailed to the cross, and I bear it no more;" },
      { startTime: 210, endTime: 224, text: "Praise the Lord, praise the Lord, O my soul!" },
      { startTime: 224, endTime: 238, text: "It is well with my soul;", isChorus: true },
      { startTime: 238, endTime: 248, text: "It is well, it is well with my soul.", isChorus: true },
    ],
  },
  {
    trackId: "sands-06",
    lines: [
      { startTime: 0, endTime: 18, text: "Amazing grace! How sweet the sound" },
      { startTime: 18, endTime: 36, text: "That saved a wretch like me!" },
      { startTime: 36, endTime: 54, text: "I once was lost, but now am found;" },
      { startTime: 54, endTime: 72, text: "Was blind, but now I see." },
      { startTime: 72, endTime: 90, text: "\u2019Twas grace that taught my heart to fear," },
      { startTime: 90, endTime: 108, text: "And grace my fears relieved;" },
      { startTime: 108, endTime: 126, text: "How precious did that grace appear" },
      { startTime: 126, endTime: 144, text: "The hour I first believed." },
      { startTime: 144, endTime: 162, text: "Through many dangers, toils, and snares," },
      { startTime: 162, endTime: 180, text: "I have already come;" },
      { startTime: 180, endTime: 198, text: "\u2019Tis grace hath brought me safe thus far," },
      { startTime: 198, endTime: 216, text: "And grace will lead me home." },
      { startTime: 216, endTime: 234, text: "When we\u2019ve been there ten thousand years," },
      { startTime: 234, endTime: 252, text: "Bright shining as the sun," },
      { startTime: 252, endTime: 268, text: "We\u2019ve no less days to sing God\u2019s praise" },
      { startTime: 268, endTime: 275, text: "Than when we first begun." },
    ],
  },
];

export function getLyricsByTrackId(trackId: string): LyricLine[] {
  return lyrics.find((l) => l.trackId === trackId)?.lines ?? [];
}
