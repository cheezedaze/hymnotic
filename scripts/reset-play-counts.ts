/**
 * Reset play counts and favorite counts on tracks to match actual user activity.
 *
 * This strips out inflated seed data and recalculates from real records in
 * user_track_plays and user_favorites tables.
 *
 * Usage:
 *   npx tsx scripts/reset-play-counts.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function reset() {
  console.log("Fetching current track counts...\n");

  // Show before values
  const before = await db.execute(
    sql`SELECT id, title, play_count, favorite_count, video_count FROM tracks ORDER BY id`
  );

  console.log("BEFORE:");
  for (const row of before) {
    console.log(
      `  ${row.id}: ${row.play_count} plays, ${row.favorite_count} favorites, ${row.video_count} video views`
    );
  }

  // Recalculate play_count from user_track_plays
  console.log("\nRecalculating play counts from user_track_plays...");
  await db.execute(sql`
    UPDATE tracks SET play_count = COALESCE((
      SELECT SUM(play_count) FROM user_track_plays WHERE track_id = tracks.id
    ), 0)
  `);

  // Recalculate favorite_count from user_favorites
  console.log("Recalculating favorite counts from user_favorites...");
  await db.execute(sql`
    UPDATE tracks SET favorite_count = COALESCE((
      SELECT COUNT(*) FROM user_favorites WHERE track_id = tracks.id
    ), 0)
  `);

  // Reset video_count (seed data artifact)
  console.log("Resetting video counts...");
  await db.execute(sql`UPDATE tracks SET video_count = 0`);

  // Show after values
  const after = await db.execute(
    sql`SELECT id, title, play_count, favorite_count, video_count FROM tracks ORDER BY id`
  );

  console.log("\nAFTER:");
  for (const row of after) {
    console.log(
      `  ${row.id}: ${row.play_count} plays, ${row.favorite_count} favorites, ${row.video_count} video views`
    );
  }

  console.log("\nDone! Track counts now reflect real user activity only.");
  await client.end();
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
