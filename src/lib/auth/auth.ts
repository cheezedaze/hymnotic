import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { SignJWT, importPKCS8 } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { upsertOAuthUser } from "./oauth-upsert";

// Apple requires the OAuth client secret to be a short-lived ES256 JWT (max 6
// months). Minting it at runtime from the structured key material means it is
// refreshed on every deploy/cold start and can never silently expire. Falls
// back to a pre-generated AUTH_APPLE_SECRET if the structured vars are absent.
async function appleClientSecret(): Promise<string | undefined> {
  const teamId = process.env.AUTH_APPLE_TEAM_ID;
  const keyId = process.env.AUTH_APPLE_KEY_ID;
  const clientId = process.env.AUTH_APPLE_ID; // Services ID, e.g. com.hymnz.app.web
  const privateKey = process.env.AUTH_APPLE_PRIVATE_KEY; // .p8 contents

  if (!teamId || !keyId || !clientId || !privateKey) {
    return process.env.AUTH_APPLE_SECRET;
  }

  const key = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d")
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);
}

const APPLE_CLIENT_SECRET = await appleClientSecret();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({}),
    Apple({ clientId: process.env.AUTH_APPLE_ID, clientSecret: APPLE_CLIENT_SECRET }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, (credentials.email as string).toLowerCase()))
          .limit(1);

        const user = result[0];
        if (!user) return null;

        // OAuth-only users cannot sign in via password
        if (!user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountTier: user.accountTier,
          isPremium: user.isPremium || user.manualPremium,
          subscriptionStatus: user.subscriptionStatus,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        if (!user.email) return false;
        const dbUser = await upsertOAuthUser({
          email: user.email,
          name: user.name || null,
        });

        user.id = dbUser.id;
        user.role = dbUser.role;
        user.accountTier = dbUser.accountTier;
        user.isPremium = dbUser.isPremium || dbUser.manualPremium;
        user.subscriptionStatus = dbUser.subscriptionStatus;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountTier = user.accountTier;
        token.isPremium = user.isPremium;
        token.subscriptionStatus = user.subscriptionStatus;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accountTier = token.accountTier as string;
        session.user.isPremium = token.isPremium as boolean;
        session.user.subscriptionStatus = token.subscriptionStatus as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

/**
 * Check that the current session belongs to an admin user.
 * Returns the session if authorized, or null if not.
 */
export async function requireAuthAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}
