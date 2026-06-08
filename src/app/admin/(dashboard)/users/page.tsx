import { getUserDirectory, getDeviceStats } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  const [allUsers, allInvitations, deviceStats] = await Promise.all([
    getUserDirectory(),
    db.select().from(invitations).orderBy(desc(invitations.createdAt)),
    getDeviceStats(),
  ]);

  const stats = allUsers.reduce(
    (acc, u) => {
      acc.total += 1;
      if (u.platforms.includes("ios")) acc.iosCount += 1;
      if (u.platforms.includes("android")) acc.androidCount += 1;
      if (!u.platforms.includes("ios") && !u.platforms.includes("android"))
        acc.webOnlyCount += 1;
      if (u.newsletterOptIn) acc.newsletterCount += 1;
      if (u.pushEnabled) acc.pushCount += 1;
      if (u.isPremium) {
        acc.premiumCount += 1;
        // Categorize premium: only an active Stripe sub counts as "paid".
        if (u.subscriptionStatus === "active") acc.paidCount += 1;
        else if (u.subscriptionStatus === "trialing") acc.trialingCount += 1;
        else if (u.subscriptionStatus === "past_due") acc.pastDueCount += 1;
        else acc.compedCount += 1;
      } else {
        acc.freeCount += 1;
      }
      return acc;
    },
    {
      total: 0,
      iosCount: 0,
      androidCount: 0,
      webOnlyCount: 0,
      newsletterCount: 0,
      pushCount: 0,
      premiumCount: 0,
      freeCount: 0,
      paidCount: 0,
      trialingCount: 0,
      pastDueCount: 0,
      compedCount: 0,
    }
  );

  return (
    <UsersManager
      stats={{ ...stats, ...deviceStats }}
      users={allUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isPremium: u.isPremium,
        manualPremium: u.manualPremium,
        accountTier: u.accountTier,
        newsletterOptIn: u.newsletterOptIn,
        pushEnabled: u.pushEnabled,
        platforms: u.platforms,
        createdAt: u.createdAt.toISOString(),
      }))}
      invitations={allInvitations.map((i) => ({
        id: i.id,
        email: i.email,
        expiresAt: i.expiresAt.toISOString(),
        usedAt: i.usedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        grantPremium: i.grantPremium,
      }))}
    />
  );
}
