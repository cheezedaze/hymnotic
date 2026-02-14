/**
 * Shared API types — used across frontend and admin.
 * These match the shapes returned by DB queries + media URL resolution.
 */

export interface ApiCollection {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  artworkKey: string | null;
  artworkUrl: string | null;
  featured: boolean;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiTrack {
  id: string;
  collectionId: string;
  title: string;
  artist: string;
  artworkKey: string | null;
  artworkUrl: string | null;
  audioKey: string | null;
  audioUrl: string | null;
  audioFormat: string | null;
  videoKey: string | null;
  videoUrl: string | null;
  videoThumbnailKey: string | null;
  videoThumbnailUrl: string | null;
  duration: number;
  trackNumber: number;
  playCount: number;
  favoriteCount: number;
  hasVideo: boolean;
  videoCount: number;
  hasLyrics: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiLyricLine {
  id: number;
  trackId: string;
  lineNumber: number;
  startTime: number;
  endTime: number;
  text: string;
  isChorus: boolean;
}
