import { eq, asc, desc, sql, inArray, and, isNotNull, gte } from "drizzle-orm";
import { db } from "./index";
import {
  collections,
  tracks,
  lyrics,
  featuredContent,
  videos,
  siteSettings,
  contentBlocks,
  users,
  userTrackPlays,
  userFavorites,
  playEvents,
  sacred7Tracks,
  announcements,
  announcementDismissals,
  type NewCollection,
  type NewTrack,
  type NewLyric,
  type NewVideo,
  type NewContentBlock,
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
    isSacred7: boolean;
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
  if (id === "favorites") {
    throw new Error("Cannot delete the Favorites collection");
  }
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
    .where(and(eq(tracks.collectionId, collectionId), eq(tracks.isActive, true)))
    .orderBy(asc(tracks.trackNumber));
}

export async function getAllTracksByCollection(collectionId: string) {
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
  originalAudioKey?: string;
  duration: number;
  trackNumber: number;
  isActive?: boolean;
  hasVideo?: boolean;
  videoKey?: string;
  videoThumbnailKey?: string;
  hasLyrics?: boolean;
  youtubeUrl?: string;
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
    originalAudioKey: string | null;
    duration: number;
    trackNumber: number;
    isActive: boolean;
    hasVideo: boolean;
    videoKey: string;
    videoThumbnailKey: string;
    hasLyrics: boolean;
    youtubeUrl: string | null;
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

export async function getTracksByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(tracks).where(inArray(tracks.id, ids));
}

export async function getAllTracks() {
  return db.select().from(tracks).orderBy(asc(tracks.collectionId), asc(tracks.trackNumber));
}

export async function getActiveTracks() {
  return db.select().from(tracks).where(eq(tracks.isActive, true)).orderBy(asc(tracks.collectionId), asc(tracks.trackNumber));
}

// =============================================================================
// Sacred 7 Queries
// =============================================================================

export async function getSacred7Selections() {
  const rows = await db
    .select({ trackId: sacred7Tracks.trackId, sortOrder: sacred7Tracks.sortOrder })
    .from(sacred7Tracks)
    .orderBy(asc(sacred7Tracks.sortOrder));
  return rows;
}

export async function getSacred7TracksWithDetails() {
  const rows = await db
    .select({
      sacred7SortOrder: sacred7Tracks.sortOrder,
      track: tracks,
    })
    .from(sacred7Tracks)
    .innerJoin(tracks, eq(sacred7Tracks.trackId, tracks.id))
    .orderBy(asc(sacred7Tracks.sortOrder));
  return rows.map((r) => r.track);
}

export async function setSacred7Tracks(trackIds: string[]) {
  await db.delete(sacred7Tracks);
  if (trackIds.length === 0) return [];
  const values = trackIds.map((trackId, i) => ({ trackId, sortOrder: i }));
  return db.insert(sacred7Tracks).values(values).returning();
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
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  return {
    collections: collectionCount.count,
    tracks: trackCount.count,
    totalPlays: totalPlays.total,
    featured: featuredCount.count,
    users: userCount.count,
  };
}

// =============================================================================
// Video Queries
// =============================================================================

export async function getAllVideos() {
  return db.select().from(videos).orderBy(asc(videos.sortOrder));
}

/** Tracks that have a youtubeUrl but no corresponding row in the videos table. */
export async function getTracksWithVideos() {
  const allVideos = await db.select({ trackId: videos.trackId }).from(videos);
  const linkedTrackIds = allVideos
    .map((v) => v.trackId)
    .filter((id): id is string => id !== null);

  const tracksWithYt = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      youtubeUrl: tracks.youtubeUrl,
      videoThumbnailKey: tracks.videoThumbnailKey,
      collectionId: tracks.collectionId,
    })
    .from(tracks)
    .where(isNotNull(tracks.youtubeUrl));

  // Filter out tracks already represented in the videos table
  return tracksWithYt.filter((t) => !linkedTrackIds.includes(t.id));
}

export async function getVideoById(id: number) {
  const result = await db
    .select()
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createVideo(data: {
  title: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  trackId?: string;
  sortOrder?: number;
}) {
  const result = await db.insert(videos).values(data).returning();
  return result[0];
}

export async function updateVideo(
  id: number,
  data: Partial<{
    title: string;
    youtubeUrl: string;
    thumbnailUrl: string | null;
    trackId: string | null;
    sortOrder: number;
  }>
) {
  const result = await db
    .update(videos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(videos.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteVideo(id: number) {
  await db.delete(videos).where(eq(videos.id, id));
}

// =============================================================================
// Site Settings Queries
// =============================================================================

export async function getSetting(key: string) {
  const result = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllSettings() {
  return db.select().from(siteSettings);
}

export async function upsertSetting(key: string, value: string) {
  const result = await db
    .insert(siteSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    })
    .returning();
  return result[0];
}

// =============================================================================
// Content Block Queries
// =============================================================================

export async function getContentBlocksByPage(page: string) {
  return db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.page, page))
    .orderBy(asc(contentBlocks.sortOrder));
}

export async function getActiveContentBlocksByPage(page: string) {
  return db
    .select()
    .from(contentBlocks)
    .where(
      and(eq(contentBlocks.page, page), eq(contentBlocks.active, true))
    )
    .orderBy(asc(contentBlocks.sortOrder));
}

export async function getContentBlockById(id: number) {
  const result = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createContentBlock(data: {
  page: string;
  sectionKey: string;
  title: string;
  body: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const result = await db
    .insert(contentBlocks)
    .values({ ...data, active: data.active ?? true })
    .returning();
  return result[0];
}

export async function updateContentBlock(
  id: number,
  data: Partial<{
    title: string;
    body: string;
    icon: string | null;
    sectionKey: string;
    sortOrder: number;
    active: boolean;
  }>
) {
  const result = await db
    .update(contentBlocks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contentBlocks.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteContentBlock(id: number) {
  await db.delete(contentBlocks).where(eq(contentBlocks.id, id));
}

// =============================================================================
// User Queries
// =============================================================================

export async function getAllUsers() {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getUserCount() {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return result.count;
}

// =============================================================================
// Per-User Play Count Queries
// =============================================================================

export async function incrementUserPlayCount(userId: string, trackId: string) {
  const existing = await db
    .select()
    .from(userTrackPlays)
    .where(
      and(
        eq(userTrackPlays.userId, userId),
        eq(userTrackPlays.trackId, trackId)
      )
    )
    .limit(1);

  if (existing[0]) {
    const result = await db
      .update(userTrackPlays)
      .set({
        playCount: existing[0].playCount + 1,
        lastPlayedAt: new Date(),
      })
      .where(eq(userTrackPlays.id, existing[0].id))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(userTrackPlays)
      .values({ userId, trackId, playCount: 1 })
      .returning();
    return result[0];
  }
}

export async function getUserPlayCounts(userId: string, trackIds?: string[]) {
  if (trackIds && trackIds.length === 0) return [];

  if (trackIds) {
    return db
      .select()
      .from(userTrackPlays)
      .where(
        and(
          eq(userTrackPlays.userId, userId),
          inArray(userTrackPlays.trackId, trackIds)
        )
      );
  }

  return db
    .select()
    .from(userTrackPlays)
    .where(eq(userTrackPlays.userId, userId));
}

export async function getUserTotalPlays(userId: string) {
  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(play_count), 0)::int` })
    .from(userTrackPlays)
    .where(eq(userTrackPlays.userId, userId));
  return result.total;
}

// =============================================================================
// Per-User Favorites Queries
// =============================================================================

export async function getUserFavoriteIds(userId: string) {
  const rows = await db
    .select({ trackId: userFavorites.trackId })
    .from(userFavorites)
    .where(eq(userFavorites.userId, userId))
    .orderBy(desc(userFavorites.createdAt));
  return rows.map((r) => r.trackId);
}

export async function addUserFavorite(userId: string, trackId: string) {
  await db
    .insert(userFavorites)
    .values({ userId, trackId })
    .onConflictDoNothing();

  // Increment global favorite count
  await db
    .update(tracks)
    .set({ favoriteCount: sql`${tracks.favoriteCount} + 1` })
    .where(eq(tracks.id, trackId));
}

export async function removeUserFavorite(userId: string, trackId: string) {
  const deleted = await db
    .delete(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.trackId, trackId)
      )
    )
    .returning();

  if (deleted.length > 0) {
    // Decrement global favorite count (min 0)
    await db
      .update(tracks)
      .set({
        favoriteCount: sql`greatest(${tracks.favoriteCount} - 1, 0)`,
      })
      .where(eq(tracks.id, trackId));
  }
}

// =============================================================================
// Announcement Queries ("What's New")
// =============================================================================

export async function getAllAnnouncements() {
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export async function getAnnouncementById(id: number) {
  const result = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getPublishedAnnouncements() {
  return db
    .select()
    .from(announcements)
    .where(isNotNull(announcements.publishedAt))
    .orderBy(desc(announcements.publishedAt));
}

export async function getLatestPublishedAnnouncement() {
  const result = await db
    .select()
    .from(announcements)
    .where(isNotNull(announcements.publishedAt))
    .orderBy(desc(announcements.publishedAt))
    .limit(1);
  return result[0] ?? null;
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  publishedAt?: Date | null;
}) {
  const result = await db.insert(announcements).values(data).returning();
  return result[0];
}

export async function updateAnnouncement(
  id: number,
  data: Partial<{
    title: string;
    body: string;
    publishedAt: Date | null;
  }>
) {
  const result = await db
    .update(announcements)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteAnnouncement(id: number) {
  // Delete dismissals first (referential integrity)
  await db
    .delete(announcementDismissals)
    .where(eq(announcementDismissals.announcementId, id));
  await db.delete(announcements).where(eq(announcements.id, id));
}

export async function hasUserDismissed(
  userId: string,
  announcementId: number
) {
  const result = await db
    .select()
    .from(announcementDismissals)
    .where(
      and(
        eq(announcementDismissals.userId, userId),
        eq(announcementDismissals.announcementId, announcementId)
      )
    )
    .limit(1);
  return result.length > 0;
}

export async function dismissAnnouncement(
  userId: string,
  announcementId: number
) {
  await db
    .insert(announcementDismissals)
    .values({ userId, announcementId })
    .onConflictDoNothing();
}

export async function getUserDismissedAnnouncementIds(userId: string) {
  const rows = await db
    .select({ announcementId: announcementDismissals.announcementId })
    .from(announcementDismissals)
    .where(eq(announcementDismissals.userId, userId));
  return rows.map((r) => r.announcementId);
}

// =============================================================================
// Play Events (individual timestamped plays for analytics)
// =============================================================================

export async function recordPlayEvent(userId: string, trackId: string) {
  await db.insert(playEvents).values({ userId, trackId });
}

// =============================================================================
// Admin: Reset Test Data
// =============================================================================

export async function resetTestData(threshold: number = 100) {
  return await db.transaction(async (tx) => {
    // Find users with inflated plays
    const inflatedPlayUsers = await tx
      .select({
        userId: userTrackPlays.userId,
        total: sql<number>`sum(${userTrackPlays.playCount})::int`,
      })
      .from(userTrackPlays)
      .groupBy(userTrackPlays.userId)
      .having(sql`sum(${userTrackPlays.playCount}) > ${threshold}`);

    // Find users with inflated favorites
    const inflatedFavUsers = await tx
      .select({
        userId: userFavorites.userId,
        total: sql<number>`count(*)::int`,
      })
      .from(userFavorites)
      .groupBy(userFavorites.userId)
      .having(sql`count(*) > ${threshold}`);

    // Combine unique user IDs
    const userIds = [
      ...new Set([
        ...inflatedPlayUsers.map((u) => u.userId),
        ...inflatedFavUsers.map((u) => u.userId),
      ]),
    ];

    let playsDeleted = 0;
    let favoritesDeleted = 0;
    let eventsDeleted = 0;

    for (const userId of userIds) {
      // Delete play records
      const deletedPlays = await tx
        .delete(userTrackPlays)
        .where(eq(userTrackPlays.userId, userId))
        .returning();
      playsDeleted += deletedPlays.length;

      // Delete favorites
      const deletedFavs = await tx
        .delete(userFavorites)
        .where(eq(userFavorites.userId, userId))
        .returning();
      favoritesDeleted += deletedFavs.length;

      // Delete play events
      const deletedEvents = await tx
        .delete(playEvents)
        .where(eq(playEvents.userId, userId))
        .returning();
      eventsDeleted += deletedEvents.length;
    }

    // Recalculate global play counts from remaining data
    await tx.execute(sql`
      UPDATE tracks SET play_count = COALESCE(
        (SELECT SUM(play_count) FROM user_track_plays WHERE track_id = tracks.id), 0
      )
    `);

    // Recalculate global favorite counts from remaining data
    await tx.execute(sql`
      UPDATE tracks SET favorite_count = COALESCE(
        (SELECT COUNT(*) FROM user_favorites WHERE track_id = tracks.id), 0
      )
    `);

    return {
      usersReset: userIds.length,
      playsDeleted,
      favoritesDeleted,
      eventsDeleted,
    };
  });
}

// =============================================================================
// Admin: Leaderboard Queries
// =============================================================================

function getStartDate(period: "month" | "week" | "today"): Date {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  } else {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export async function getTopTracksByPlays(
  period: "all" | "month" | "week" | "today"
) {
  if (period === "all") {
    return db
      .select({
        trackId: tracks.id,
        title: tracks.title,
        collection: collections.title,
        count: tracks.playCount,
      })
      .from(tracks)
      .innerJoin(collections, eq(tracks.collectionId, collections.id))
      .orderBy(desc(tracks.playCount))
      .limit(10);
  }

  const startDate = getStartDate(period);
  return db
    .select({
      trackId: playEvents.trackId,
      title: tracks.title,
      collection: collections.title,
      count: sql<number>`count(*)::int`,
    })
    .from(playEvents)
    .innerJoin(tracks, eq(playEvents.trackId, tracks.id))
    .innerJoin(collections, eq(tracks.collectionId, collections.id))
    .where(gte(playEvents.playedAt, startDate))
    .groupBy(playEvents.trackId, tracks.title, collections.title)
    .orderBy(sql`count(*) desc`)
    .limit(10);
}

export async function getTopTracksByFavorites(
  period: "all" | "month" | "week" | "today"
) {
  if (period === "all") {
    return db
      .select({
        trackId: tracks.id,
        title: tracks.title,
        collection: collections.title,
        count: tracks.favoriteCount,
      })
      .from(tracks)
      .innerJoin(collections, eq(tracks.collectionId, collections.id))
      .orderBy(desc(tracks.favoriteCount))
      .limit(10);
  }

  const startDate = getStartDate(period);
  return db
    .select({
      trackId: userFavorites.trackId,
      title: tracks.title,
      collection: collections.title,
      count: sql<number>`count(*)::int`,
    })
    .from(userFavorites)
    .innerJoin(tracks, eq(userFavorites.trackId, tracks.id))
    .innerJoin(collections, eq(tracks.collectionId, collections.id))
    .where(gte(userFavorites.createdAt, startDate))
    .groupBy(userFavorites.trackId, tracks.title, collections.title)
    .orderBy(sql`count(*) desc`)
    .limit(10);
}
