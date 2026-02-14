export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  artwork: string;
  trackCount: number;
  totalDuration: string;
  featured: boolean;
  description: string;
}

export const collections: Collection[] = [
  {
    id: "sands-of-the-sea",
    title: "Sands of the Sea",
    subtitle: "Eternal shores of faith",
    artwork: "/images/album-sands.png",
    trackCount: 7,
    totalDuration: "28 min",
    featured: false,
    description: "Hymns inspired by the vastness of creation and divine majesty.",
  },
  {
    id: "peace",
    title: "Peace",
    subtitle: "Finding stillness within",
    artwork: "/images/album-peace.png",
    trackCount: 5,
    totalDuration: "21 min",
    featured: false,
    description: "A collection of hymns focused on inner peace and tranquility.",
  },
];

export const featuredTrackId = "sands-01";

export function getCollectionById(id: string): Collection | undefined {
  return collections.find((c) => c.id === id);
}
