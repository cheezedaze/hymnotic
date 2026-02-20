import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Set it in .env.local for development or in your deployment environment."
  );
}

// Create postgres connection
// In production, use connection pooling (Railway provides this)
// prepare: false is required for Next.js/serverless environments where
// the module may be re-evaluated between requests (Turbopack HMR, edge),
// which causes "Failed query" errors from stale prepared statement caches.
const client = postgres(connectionString, {
  max: 10, // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export { schema };

// Export types
export type { Collection, Track, Lyric, FeaturedContent } from "./schema";
