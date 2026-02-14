import { redirect } from "next/navigation";
import {
  getSessionTokenFromCookies,
  validateSession,
} from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check (middleware does initial redirect,
  // this validates the actual session)
  const token = await getSessionTokenFromCookies();

  if (!token || !validateSession(token)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-midnight">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
