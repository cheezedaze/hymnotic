/**
 * Seed script - migrates your existing mock data to the database.
 *
 * Usage:
 *   npx tsx infrastructure/db/seed.ts
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env.local
 *   - Database migrations applied: npx drizzle-kit push
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import {
  collections,
  tracks,
  lyrics,
  featuredContent,
  users,
} from "../../src/lib/db/schema";

// Load env
import { config } from "dotenv";
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL not set in .env.local");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log("🌱 Seeding Hymnotic database...\n");

  // =========================================================================
  // Collections
  // =========================================================================
  console.log("📀 Inserting collections...");
  await db
    .insert(collections)
    .values([
      {
        id: "sands-of-the-sea",
        title: "Sands of the Sea",
        subtitle: "Eternal shores of faith",
        description:
          "Hymns inspired by the vastness of creation and divine majesty.",
        artworkKey: "images/artwork/album-sands.png",
        featured: false,
        sortOrder: 1,
        publishedAt: new Date(),
      },
      {
        id: "peace",
        title: "Peace",
        subtitle: "Finding stillness within",
        description:
          "A collection of hymns focused on inner peace and tranquility.",
        artworkKey: "images/artwork/album-peace.png",
        featured: false,
        sortOrder: 2,
        publishedAt: new Date(),
      },
    ])
    .onConflictDoNothing();
  console.log("   ✅ 2 collections inserted\n");

  // =========================================================================
  // Tracks
  // =========================================================================
  console.log("🎵 Inserting tracks...");
  const trackData = [
    // Sands of the Sea
    {
      id: "sands-01",
      collectionId: "sands-of-the-sea",
      title: "Brightly Beams Our Father's Mercy",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-01.mp3",
      duration: 215,
      trackNumber: 1,
      playCount: 18200,
      favoriteCount: 980,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: true,
    },
    {
      id: "sands-02",
      collectionId: "sands-of-the-sea",
      title: "It is Well With My Soul",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-02.mp3",
      duration: 248,
      trackNumber: 2,
      playCount: 14890,
      favoriteCount: 753,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: true,
    },
    {
      id: "sands-03",
      collectionId: "sands-of-the-sea",
      title: "Rock of Ages",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-03.mp3",
      duration: 196,
      trackNumber: 3,
      playCount: 12300,
      favoriteCount: 689,
      hasVideo: true,
      videoKey: "video/tracks/sands-03.mp4",
      videoCount: 570,
      hasLyrics: false,
    },
    {
      id: "sands-04",
      collectionId: "sands-of-the-sea",
      title: "I Need Thee Every Hour",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-04.mp3",
      duration: 232,
      trackNumber: 4,
      playCount: 17900,
      favoriteCount: 954,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
    {
      id: "sands-05",
      collectionId: "sands-of-the-sea",
      title: "Blessed Assurance",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-05.mp3",
      duration: 210,
      trackNumber: 5,
      playCount: 13420,
      favoriteCount: 712,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
    {
      id: "sands-06",
      collectionId: "sands-of-the-sea",
      title: "Amazing Grace",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-06.mp3",
      duration: 275,
      trackNumber: 6,
      playCount: 25350,
      favoriteCount: 1245,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: true,
    },
    {
      id: "sands-07",
      collectionId: "sands-of-the-sea",
      title: "How Great Thou Art",
      artist: "Hymnotic",
      audioKey: "audio/tracks/sands-07.mp3",
      duration: 290,
      trackNumber: 7,
      playCount: 20180,
      favoriteCount: 1100,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
    // Peace
    {
      id: "peace-01",
      collectionId: "peace",
      title: "Be Still My Soul",
      artist: "Hymnotic",
      audioKey: "audio/tracks/peace-01.mp3",
      duration: 245,
      trackNumber: 1,
      playCount: 12453,
      favoriteCount: 892,
      hasVideo: true,
      videoKey: "video/tracks/peace-01.mp4",
      videoCount: 320,
      hasLyrics: false,
    },
    {
      id: "peace-02",
      collectionId: "peace",
      title: "Abide with Me",
      artist: "Hymnotic",
      audioKey: "audio/tracks/peace-02.mp3",
      duration: 267,
      trackNumber: 2,
      playCount: 9821,
      favoriteCount: 641,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
    {
      id: "peace-03",
      collectionId: "peace",
      title: "Nearer My God to Thee",
      artist: "Hymnotic",
      audioKey: "audio/tracks/peace-03.mp3",
      duration: 228,
      trackNumber: 3,
      playCount: 15200,
      favoriteCount: 830,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
    {
      id: "peace-04",
      collectionId: "peace",
      title: "Sweet Hour of Prayer",
      artist: "Hymnotic",
      audioKey: "audio/tracks/peace-04.mp3",
      duration: 254,
      trackNumber: 4,
      playCount: 8740,
      favoriteCount: 521,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
    {
      id: "peace-05",
      collectionId: "peace",
      title: "Lead Kindly Light",
      artist: "Hymnotic",
      audioKey: "audio/tracks/peace-05.mp3",
      duration: 198,
      trackNumber: 5,
      playCount: 7350,
      favoriteCount: 412,
      hasVideo: false,
      videoCount: 0,
      hasLyrics: false,
    },
  ];

  await db.insert(tracks).values(trackData).onConflictDoNothing();
  console.log(`   ✅ ${trackData.length} tracks inserted\n`);

  // =========================================================================
  // Lyrics
  // =========================================================================
  console.log("📝 Inserting lyrics...");

  type LyricInput = { startTime: number; endTime: number; text: string; isChorus?: boolean };

  // sands-01: Brightly Beams
  const sands01Lyrics: LyricInput[] = [
    { startTime: 0, endTime: 12, text: "Brightly beams our Father\u2019s mercy" },
    { startTime: 12, endTime: 22, text: "From his lighthouse evermore," },
    { startTime: 22, endTime: 32, text: "But to us he gives the keeping" },
    { startTime: 32, endTime: 42, text: "Of the lights along the shore." },
    {
      startTime: 42,
      endTime: 55,
      text: "Let the lower lights be burning;",
      isChorus: true,
    },
    {
      startTime: 55,
      endTime: 65,
      text: "Send a gleam across the wave.",
      isChorus: true,
    },
    {
      startTime: 65,
      endTime: 78,
      text: "Some poor fainting, struggling seaman",
      isChorus: true,
    },
    {
      startTime: 78,
      endTime: 90,
      text: "You may rescue, you may save.",
      isChorus: true,
    },
    { startTime: 90, endTime: 102, text: "Dark the night of sin has settled;" },
    { startTime: 102, endTime: 112, text: "Loud the angry billows roar." },
    {
      startTime: 112,
      endTime: 124,
      text: "Eager eyes are watching, longing,",
    },
    { startTime: 124, endTime: 136, text: "For the lights along the shore." },
    {
      startTime: 136,
      endTime: 149,
      text: "Let the lower lights be burning;",
      isChorus: true,
    },
    {
      startTime: 149,
      endTime: 159,
      text: "Send a gleam across the wave.",
      isChorus: true,
    },
    {
      startTime: 159,
      endTime: 172,
      text: "Some poor fainting, struggling seaman",
      isChorus: true,
    },
    {
      startTime: 172,
      endTime: 185,
      text: "You may rescue, you may save.",
      isChorus: true,
    },
    {
      startTime: 185,
      endTime: 197,
      text: "Trim your feeble lamp, my brother;",
    },
    {
      startTime: 197,
      endTime: 207,
      text: "Some poor sailor, tempest-tossed,",
    },
    {
      startTime: 207,
      endTime: 215,
      text: "Trying now to make the harbor,",
    },
  ];

  // sands-02: It is Well With My Soul
  const sands02Lyrics: LyricInput[] = [
    {
      startTime: 0,
      endTime: 14,
      text: "When peace like a river attendeth my way,",
    },
    {
      startTime: 14,
      endTime: 28,
      text: "When sorrows like sea billows roll\u2014",
    },
    {
      startTime: 28,
      endTime: 42,
      text: "Whatever my lot, thou hast taught me to say,",
    },
    {
      startTime: 42,
      endTime: 56,
      text: "It is well, it is well with my soul.",
    },
    {
      startTime: 56,
      endTime: 70,
      text: "It is well with my soul;",
      isChorus: true,
    },
    {
      startTime: 70,
      endTime: 84,
      text: "It is well, it is well with my soul.",
      isChorus: true,
    },
    {
      startTime: 84,
      endTime: 98,
      text: "Though Satan should buffet, though trials should come,",
    },
    {
      startTime: 98,
      endTime: 112,
      text: "Let this blest assurance control:",
    },
    {
      startTime: 112,
      endTime: 126,
      text: "That Christ hath regarded my helpless estate,",
    },
    {
      startTime: 126,
      endTime: 140,
      text: "And hath shed his own blood for my soul.",
    },
    {
      startTime: 140,
      endTime: 154,
      text: "It is well with my soul;",
      isChorus: true,
    },
    {
      startTime: 154,
      endTime: 168,
      text: "It is well, it is well with my soul.",
      isChorus: true,
    },
    {
      startTime: 168,
      endTime: 182,
      text: "My sin\u2014oh, the bliss of this glorious thought\u2014",
    },
    {
      startTime: 182,
      endTime: 196,
      text: "My sin, not in part, but the whole,",
    },
    {
      startTime: 196,
      endTime: 210,
      text: "Is nailed to the cross, and I bear it no more;",
    },
    {
      startTime: 210,
      endTime: 224,
      text: "Praise the Lord, praise the Lord, O my soul!",
    },
    {
      startTime: 224,
      endTime: 238,
      text: "It is well with my soul;",
      isChorus: true,
    },
    {
      startTime: 238,
      endTime: 248,
      text: "It is well, it is well with my soul.",
      isChorus: true,
    },
  ];

  // sands-06: Amazing Grace
  const sands06Lyrics: LyricInput[] = [
    { startTime: 0, endTime: 18, text: "Amazing grace! How sweet the sound" },
    { startTime: 18, endTime: 36, text: "That saved a wretch like me!" },
    {
      startTime: 36,
      endTime: 54,
      text: "I once was lost, but now am found;",
    },
    { startTime: 54, endTime: 72, text: "Was blind, but now I see." },
    {
      startTime: 72,
      endTime: 90,
      text: "\u2019Twas grace that taught my heart to fear,",
    },
    { startTime: 90, endTime: 108, text: "And grace my fears relieved;" },
    {
      startTime: 108,
      endTime: 126,
      text: "How precious did that grace appear",
    },
    { startTime: 126, endTime: 144, text: "The hour I first believed." },
    {
      startTime: 144,
      endTime: 162,
      text: "Through many dangers, toils, and snares,",
    },
    { startTime: 162, endTime: 180, text: "I have already come;" },
    {
      startTime: 180,
      endTime: 198,
      text: "\u2019Tis grace hath brought me safe thus far,",
    },
    { startTime: 198, endTime: 216, text: "And grace will lead me home." },
    {
      startTime: 216,
      endTime: 234,
      text: "When we\u2019ve been there ten thousand years,",
    },
    { startTime: 234, endTime: 252, text: "Bright shining as the sun," },
    {
      startTime: 252,
      endTime: 268,
      text: "We\u2019ve no less days to sing God\u2019s praise",
    },
    { startTime: 268, endTime: 275, text: "Than when we first begun." },
  ];

  const allLyrics = [
    ...sands01Lyrics.map((l, i) => ({
      trackId: "sands-01",
      lineNumber: i + 1,
      ...l,
      isChorus: l.isChorus ?? false,
    })),
    ...sands02Lyrics.map((l, i) => ({
      trackId: "sands-02",
      lineNumber: i + 1,
      ...l,
      isChorus: l.isChorus ?? false,
    })),
    ...sands06Lyrics.map((l, i) => ({
      trackId: "sands-06",
      lineNumber: i + 1,
      ...l,
      isChorus: l.isChorus ?? false,
    })),
  ];

  await db.insert(lyrics).values(allLyrics).onConflictDoNothing();
  console.log(`   ✅ ${allLyrics.length} lyric lines inserted\n`);

  // =========================================================================
  // Featured Content
  // =========================================================================
  console.log("⭐ Inserting featured content...");
  await db
    .insert(featuredContent)
    .values([
      { type: "track", referenceId: "sands-01", position: 1, active: true },
    ])
    .onConflictDoNothing();
  console.log("   ✅ Featured content set\n");

  // =========================================================================
  // Admin User
  // =========================================================================
  console.log("👤 Creating admin user...");
  const adminPassword = process.env.ADMIN_PASSWORD || "HymnoticAdmin2025!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: "admin@hymnotic.app",
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    })
    .onConflictDoNothing();
  console.log("   ✅ Admin user created (admin@hymnotic.app)\n");

  console.log("==========================================");
  console.log("🎉 Seed complete!");
  console.log("==========================================");
  console.log("");
  console.log("Your database now contains:");
  console.log("  📀 2 collections");
  console.log("  🎵 12 tracks");
  console.log(`  📝 ${allLyrics.length} lyric lines (3 tracks)`);
  console.log("  ⭐ 1 featured track");
  console.log("  👤 1 admin user (admin@hymnotic.app)");

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
