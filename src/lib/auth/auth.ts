import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({}),
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
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        // Look up existing user by email
        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let dbUser = result[0];

        if (!dbUser) {
          // Create a new user for first-time Google sign-in
          const id = crypto.randomUUID();
          await db.insert(users).values({
            id,
            email,
            name: user.name || null,
            passwordHash: null,
            role: "USER",
            accountTier: "free",
            isPremium: false,
            manualPremium: false,
            newsletterOptIn: true,
          });
          dbUser = {
            id,
            email,
            name: user.name || null,
            passwordHash: null,
            role: "USER",
            accountTier: "free",
            isPremium: false,
            manualPremium: false,
            stripeCustomerId: null,
            subscriptionStatus: null,
            subscriptionEndDate: null,
            newsletterOptIn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }

        // Attach custom fields so the jwt callback can pick them up
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
