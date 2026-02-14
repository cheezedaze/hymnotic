import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  serial,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// =============================================================================
// Collections (Albums)
// =============================================================================
export const collections = pgTable(
  "collections",
  {
    id: varchar("id", { length: 128 }).primaryKey(), // e.g., "sands-of-the-sea"
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    artworkKey: text("artwork_key"), // S3 key: "images/artwork/album-sands.png"
    featured: boolean("featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_collections_featured").on(table.featured),
    index("idx_collections_sort_order").on(table.sortOrder),
  ]
);

// =============================================================================
// Tracks
// =============================================================================
export const tracks = pgTable(
  "tracks",
  {
    id: varchar("id", { length: 128 }).primaryKey(), // e.g., "sands-01"
    collectionId: varchar("collection_id", { length: 128 })
      .notNull()
      .references(() => collections.id),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("Hymnotic"),
    artworkKey: text("artwork_key"), // S3 key, or null to inherit from collection
    audioKey: text("audio_key"), // S3 key: "audio/tracks/sands-01.mp3"
    audioFormat: varchar("audio_format", { length: 10 }), // "mp3", "flac", "aac"
    duration: real("duration").notNull(), // seconds
    trackNumber: integer("track_number").notNull(),
    playCount: integer("play_count").default(0).notNull(),
    favoriteCount: integer("favorite_count").default(0).notNull(),
    hasVideo: boolean("has_video").default(false).notNull(),
    videoKey: text("video_key"), // S3 key: "video/tracks/sands-03.mp4"
    videoThumbnailKey: text("video_thumbnail_key"),
    videoCount: integer("video_count").default(0).notNull(),
    hasLyrics: boolean("has_lyrics").default(false).notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tracks_collection").on(table.collectionId),
    index("idx_tracks_collection_order").on(
      table.collectionId,
      table.trackNumber
    ),
  ]
);

// =============================================================================
// Lyrics (timestamped lines for sync)
// =============================================================================
export const lyrics = pgTable(
  "lyrics",
  {
    id: serial("id").primaryKey(),
    trackId: varchar("track_id", { length: 128 })
      .notNull()
      .references(() => tracks.id),
    lineNumber: integer("line_number").notNull(),
    startTime: real("start_time").notNull(), // seconds
    endTime: real("end_time").notNull(), // seconds
    text: text("text").notNull(),
    isChorus: boolean("is_chorus").default(false).notNull(),
  },
  (table) => [
    index("idx_lyrics_track").on(table.trackId),
    uniqueIndex("idx_lyrics_track_line").on(table.trackId, table.lineNumber),
  ]
);

// =============================================================================
// Featured Content (what shows on home page)
// =============================================================================
export const featuredContent = pgTable("featured_content", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // "track", "collection", "hero"
  referenceId: varchar("reference_id", { length: 128 }).notNull(),
  position: integer("position").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// Type exports for use in API routes
// =============================================================================
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Lyric = typeof lyrics.$inferSelect;
export type NewLyric = typeof lyrics.$inferInsert;
export type FeaturedContent = typeof featuredContent.$inferSelect;
