import { eq, asc, desc, sql } from "drizzle-orm";
import { db } from "./index";
import {
  collections,
  tracks,
  lyrics,
  featuredContent,
  type NewCollection,
  type NewTrack,
  type NewLyric,
} from "./schema";

// =============================================================================
// Collection Queries
// =============================================================================

export async function getAllCollections() {
  return db
    .select()
    .from(collections)
    .orderBy(asc(collections.sortOrder));
}

export async function getCollectionById(id: string) {
  const result = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getCollectionWithTracks(id: string) {
  const collection = await getCollectionById(id);
  if (!collection) return null;

  const collectionTracks = await getTracksByCollection(id);
  return { ...collection, tracks: collectionTracks };
}

export async function createCollection(data: {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  artworkKey?: string;
  featured?: boolean;
  sortOrder?: number;
}) {
  const result = await db.insert(collections).values(data).returning();
  return result[0];
}

export async function updateCollection(
  id: string,
  data: Partial<{
    title: string;
    subtitle: string;
    description: string;
    artworkKey: string;
    featured: boolean;
    sortOrder: number;
  }>
) {
  const result = await db
    .update(collections)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteCollection(id: string) {
  // Check for tracks first
  const collectionTracks = await getTracksByCollection(id);
  if (collectionTracks.length > 0) {
    throw new Error("Cannot delete collection with existing tracks");
  }
  await db.delete(collections).where(eq(collections.id, id));
}

// =============================================================================
// Track Queries
// =============================================================================

export async function getTracksByCollection(collectionId: string) {
  return db
    .select()
    .from(tracks)
    .where(eq(tracks.collectionId, collectionId))
    .orderBy(asc(tracks.trackNumber));
}

export async function getTrackById(id: string) {
  const result = await db
    .select()
    .from(tracks)
    .where(eq(tracks.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function incrementPlayCount(trackId: string) {
  const track = await getTrackById(trackId);
  if (!track) return null;

  const result = await db
    .update(tracks)
    .set({ playCount: track.playCount + 1 })
    .where(eq(tracks.id, trackId))
    .returning();
  return result[0];
}

export async function incrementVideoCount(trackId: string) {
  const track = await getTrackById(trackId);
  if (!track) return null;

  const result = await db
    .update(tracks)
    .set({ videoCount: track.videoCount + 1 })
    .where(eq(tracks.id, trackId))
    .returning();
  return result[0];
}

export async function createTrack(data: {
  id: string;
  collectionId: string;
  title: string;
  artist?: string;
  artworkKey?: string;
  audioKey?: string;
  audioFormat?: string;
  duration: number;
  trackNumber: number;
  hasVideo?: boolean;
  videoKey?: string;
  videoThumbnailKey?: string;
  hasLyrics?: boolean;
}) {
  const result = await db.insert(tracks).values(data).returning();
  return result[0];
}

export async function updateTrack(
  id: string,
  data: Partial<{
    title: string;
    artist: string;
    collectionId: string;
    artworkKey: string;
    audioKey: string;
    audioFormat: string;
    duration: number;
    trackNumber: number;
    hasVideo: boolean;
    videoKey: string;
    videoThumbnailKey: string;
    hasLyrics: boolean;
  }>
) {
  const result = await db
    .update(tracks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tracks.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteTrack(id: string) {
  // Delete associated lyrics first
  await db.delete(lyrics).where(eq(lyrics.trackId, id));
  // Delete the track
  await db.delete(tracks).where(eq(tracks.id, id));
}

export async function getAllTracks() {
  return db.select().from(tracks).orderBy(asc(tracks.collectionId), asc(tracks.trackNumber));
}

// =============================================================================
// Lyrics Queries
// =============================================================================

export async function getLyricsByTrackId(trackId: string) {
  return db
    .select()
    .from(lyrics)
    .where(eq(lyrics.trackId, trackId))
    .orderBy(asc(lyrics.lineNumber));
}

export async function upsertLyrics(
  trackId: string,
  lines: Array<{
    lineNumber: number;
    startTime: number;
    endTime: number;
    text: string;
    isChorus?: boolean;
  }>
) {
  // Delete existing lyrics
  await db.delete(lyrics).where(eq(lyrics.trackId, trackId));

  if (lines.length === 0) return [];

  // Insert new lyrics
  const result = await db
    .insert(lyrics)
    .values(
      lines.map((line) => ({
        trackId,
        ...line,
        isChorus: line.isChorus ?? false,
      }))
    )
    .returning();

  // Update track's hasLyrics flag
  await db
    .update(tracks)
    .set({ hasLyrics: lines.length > 0, updatedAt: new Date() })
    .where(eq(tracks.id, trackId));

  return result;
}

export async function deleteLyrics(trackId: string) {
  await db.delete(lyrics).where(eq(lyrics.trackId, trackId));
  await db
    .update(tracks)
    .set({ hasLyrics: false, updatedAt: new Date() })
    .where(eq(tracks.id, trackId));
}

// =============================================================================
// Featured Content Queries
// =============================================================================

export async function getFeaturedContent() {
  return db
    .select()
    .from(featuredContent)
    .where(eq(featuredContent.active, true))
    .orderBy(asc(featuredContent.position));
}

export async function getFeaturedContentById(id: number) {
  const result = await db
    .select()
    .from(featuredContent)
    .where(eq(featuredContent.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createFeaturedContent(data: {
  type: string;
  referenceId: string;
  position: number;
  active?: boolean;
}) {
  const result = await db
    .insert(featuredContent)
    .values({ ...data, active: data.active ?? true })
    .returning();
  return result[0];
}

export async function updateFeaturedContent(
  id: number,
  data: Partial<{ position: number; active: boolean }>
) {
  const result = await db
    .update(featuredContent)
    .set(data)
    .where(eq(featuredContent.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteFeaturedContent(id: number) {
  await db.delete(featuredContent).where(eq(featuredContent.id, id));
}

// =============================================================================
// Admin Stats
// =============================================================================

export async function getAdminStats() {
  const [collectionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collections);
  const [trackCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tracks);
  const [totalPlays] = await db
    .select({ total: sql<number>`coalesce(sum(play_count), 0)::int` })
    .from(tracks);
  const [featuredCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(featuredContent)
    .where(eq(featuredContent.active, true));

  return {
    collections: collectionCount.count,
    tracks: trackCount.count,
    totalPlays: totalPlays.total,
    featured: featuredCount.count,
  };
}
