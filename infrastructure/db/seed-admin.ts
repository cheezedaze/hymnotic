/**
 * Seed admin user script.
 *
 * Usage:
 *   npx tsx infrastructure/db/seed-admin.ts
 *
 * Creates the initial admin user so you can sign in and invite others.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users } from "../../src/lib/db/schema";

import { config } from "dotenv";
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seedAdmin() {
  const email = "admin@hymnotic.app";
  const password = "HymnoticAdmin2025!";
  const passwordHash = await bcrypt.hash(password, 12);

  console.log("Creating/resetting admin user...");

  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, role: "ADMIN" },
    });

  console.log(`Admin user ready!`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Sign in at: http://localhost:3333/auth/signin`);

  await client.end();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
