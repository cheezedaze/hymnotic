import { getAllUsers } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  const [allUsers, allInvitations] = await Promise.all([
    getAllUsers(),
    db.select().from(invitations).orderBy(desc(invitations.createdAt)),
  ]);

  return (
    <UsersManager
      users={allUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      }))}
      invitations={allInvitations.map((i) => ({
        id: i.id,
        email: i.email,
        expiresAt: i.expiresAt.toISOString(),
        usedAt: i.usedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
