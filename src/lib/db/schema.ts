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
    artist: text("artist").notNull().default("HYMNZ"),
    artworkKey: text("artwork_key"), // S3 key, or null to inherit from collection
    audioKey: text("audio_key"), // S3 key: "audio/tracks/sands-01.mp3"
    audioFormat: varchar("audio_format", { length: 10 }), // "mp3", "flac", "aac"
    originalAudioKey: text("original_audio_key"), // S3 key for original WAV: "audio/originals/sands-01.wav"
    duration: real("duration").notNull(), // seconds
    trackNumber: integer("track_number").notNull(),
    playCount: integer("play_count").default(0).notNull(),
    favoriteCount: integer("favorite_count").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    hasVideo: boolean("has_video").default(false).notNull(),
    videoKey: text("video_key"), // S3 key: "video/tracks/sands-03.mp4"
    videoThumbnailKey: text("video_thumbnail_key"),
    videoCount: integer("video_count").default(0).notNull(),
    hasLyrics: boolean("has_lyrics").default(false).notNull(),
    youtubeUrl: text("youtube_url"),
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
// Videos (standalone YouTube videos + track-linked)
// =============================================================================
export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    youtubeUrl: text("youtube_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    trackId: varchar("track_id", { length: 128 }).references(() => tracks.id),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_videos_track").on(table.trackId),
    index("idx_videos_sort").on(table.sortOrder),
  ]
);

// =============================================================================
// Site Settings (key-value config)
// =============================================================================
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// Content Blocks (dynamic page sections)
// =============================================================================
export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: serial("id").primaryKey(),
    page: text("page").notNull(),
    sectionKey: text("section_key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_content_blocks_page").on(table.page),
    index("idx_content_blocks_page_sort").on(table.page, table.sortOrder),
  ]
);

// =============================================================================
// Users
// =============================================================================
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: text("name"),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("USER"), // "ADMIN" | "USER"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_users_email").on(table.email)]
);

// =============================================================================
// Invitations
// =============================================================================
export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    invitedById: varchar("invited_by_id", { length: 128 }).references(
      () => users.id
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_invitations_token").on(table.token),
    index("idx_invitations_email").on(table.email),
  ]
);

// =============================================================================
// Per-User Play Tracking
// =============================================================================
export const userTrackPlays = pgTable(
  "user_track_plays",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id),
    trackId: varchar("track_id", { length: 128 })
      .notNull()
      .references(() => tracks.id),
    playCount: integer("play_count").default(0).notNull(),
    lastPlayedAt: timestamp("last_played_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_track_plays_user_track").on(
      table.userId,
      table.trackId
    ),
    index("idx_user_track_plays_user").on(table.userId),
  ]
);

// =============================================================================
// Per-User Favorites
// =============================================================================
export const userFavorites = pgTable(
  "user_favorites",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id),
    trackId: varchar("track_id", { length: 128 })
      .notNull()
      .references(() => tracks.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_favorites_user_track").on(
      table.userId,
      table.trackId
    ),
    index("idx_user_favorites_user").on(table.userId),
  ]
);

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
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type UserTrackPlay = typeof userTrackPlays.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
