import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";

export type OAuthProfile = {
  email: string;
  name: string | null;
};

/**
 * Look up an existing user by email or create one for first-time OAuth sign-in.
 * Used by both the NextAuth web `signIn` callback and the mobile ID-token routes
 * so a Google/Apple sign-in produces the exact same user record regardless of
 * which path the credential arrived through.
 */
export async function upsertOAuthUser(profile: OAuthProfile): Promise<User> {
  const email = profile.email.toLowerCase();

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result[0]) return result[0];

  const id = crypto.randomUUID();
  const now = new Date();
  const newUser: User = {
    id,
    email,
    name: profile.name,
    passwordHash: null,
    role: "USER",
    accountTier: "free",
    isPremium: false,
    manualPremium: false,
    stripeCustomerId: null,
    subscriptionStatus: null,
    subscriptionEndDate: null,
    newsletterOptIn: false,
    onboardingCompletedAt: null,
    onboardingLastDismissedAt: null,
    onboardingDismissCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values({
    id,
    email,
    name: profile.name,
    passwordHash: null,
    role: "USER",
    accountTier: "free",
    isPremium: false,
    manualPremium: false,
    newsletterOptIn: false,
  });

  return newUser;
}
