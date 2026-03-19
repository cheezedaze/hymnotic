import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
    accountTier?: string;
    isPremium?: boolean;
    subscriptionStatus?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      accountTier?: string;
      isPremium?: boolean;
      subscriptionStatus?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accountTier?: string;
    isPremium?: boolean;
    subscriptionStatus?: string | null;
  }
}
