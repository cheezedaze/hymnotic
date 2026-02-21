import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-dvh bg-midnight">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
