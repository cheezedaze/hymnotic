import { eq, asc, desc } from "drizzle-orm";
import { db } from "./index";
import { collections, tracks, lyrics, featuredContent } from "./schema";

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
