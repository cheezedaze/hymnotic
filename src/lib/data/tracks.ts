export interface Track {
  id: string;
  collectionId: string;
  title: string;
  artist: string;
  artwork: string;
  audioSrc: string;
  duration: number;
  trackNumber: number;
  playCount: number;
  favoriteCount: number;
  hasVideo: boolean;
  videoCount: number;
}

export const tracks: Track[] = [
  // Sands of the Sea collection
  {
    id: "sands-01",
    collectionId: "sands-of-the-sea",
    title: "Brightly Beams Our Father's Mercy",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 215,
    trackNumber: 1,
    playCount: 18200,
    favoriteCount: 980,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "sands-02",
    collectionId: "sands-of-the-sea",
    title: "It is Well With My Soul",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 248,
    trackNumber: 2,
    playCount: 14890,
    favoriteCount: 753,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "sands-03",
    collectionId: "sands-of-the-sea",
    title: "Rock of Ages",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 196,
    trackNumber: 3,
    playCount: 12300,
    favoriteCount: 689,
    hasVideo: true,
    videoCount: 570,
  },
  {
    id: "sands-04",
    collectionId: "sands-of-the-sea",
    title: "I Need Thee Every Hour",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 232,
    trackNumber: 4,
    playCount: 17900,
    favoriteCount: 954,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "sands-05",
    collectionId: "sands-of-the-sea",
    title: "Blessed Assurance",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 210,
    trackNumber: 5,
    playCount: 13420,
    favoriteCount: 712,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "sands-06",
    collectionId: "sands-of-the-sea",
    title: "Amazing Grace",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 275,
    trackNumber: 6,
    playCount: 25350,
    favoriteCount: 1245,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "sands-07",
    collectionId: "sands-of-the-sea",
    title: "How Great Thou Art",
    artist: "Hymnotic",
    artwork: "/images/album-sands.png",
    audioSrc: "",
    duration: 290,
    trackNumber: 7,
    playCount: 20180,
    favoriteCount: 1100,
    hasVideo: false,
    videoCount: 0,
  },
  // Peace collection
  {
    id: "peace-01",
    collectionId: "peace",
    title: "Be Still My Soul",
    artist: "Hymnotic",
    artwork: "/images/album-peace.png",
    audioSrc: "",
    duration: 245,
    trackNumber: 1,
    playCount: 12453,
    favoriteCount: 892,
    hasVideo: true,
    videoCount: 320,
  },
  {
    id: "peace-02",
    collectionId: "peace",
    title: "Abide with Me",
    artist: "Hymnotic",
    artwork: "/images/album-peace.png",
    audioSrc: "",
    duration: 267,
    trackNumber: 2,
    playCount: 9821,
    favoriteCount: 641,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "peace-03",
    collectionId: "peace",
    title: "Nearer My God to Thee",
    artist: "Hymnotic",
    artwork: "/images/album-peace.png",
    audioSrc: "",
    duration: 228,
    trackNumber: 3,
    playCount: 15200,
    favoriteCount: 830,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "peace-04",
    collectionId: "peace",
    title: "Sweet Hour of Prayer",
    artist: "Hymnotic",
    artwork: "/images/album-peace.png",
    audioSrc: "",
    duration: 254,
    trackNumber: 4,
    playCount: 8740,
    favoriteCount: 521,
    hasVideo: false,
    videoCount: 0,
  },
  {
    id: "peace-05",
    collectionId: "peace",
    title: "Lead Kindly Light",
    artist: "Hymnotic",
    artwork: "/images/album-peace.png",
    audioSrc: "",
    duration: 198,
    trackNumber: 5,
    playCount: 7350,
    favoriteCount: 412,
    hasVideo: false,
    videoCount: 0,
  },
];

export function getTracksByCollection(collectionId: string): Track[] {
  return tracks.filter((t) => t.collectionId === collectionId);
}

export function getTrackById(id: string): Track | undefined {
  return tracks.find((t) => t.id === id);
}
