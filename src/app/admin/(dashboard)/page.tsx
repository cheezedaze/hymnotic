import { getAdminStats, getAllCollections, getAllTracks } from "@/lib/db/queries";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  let stats = { collections: 0, tracks: 0, totalPlays: 0, featured: 0 };
  let recentTracks: Awaited<ReturnType<typeof getAllTracks>> = [];

  try {
    stats = await getAdminStats();
    const allTracks = await getAllTracks();
    recentTracks = allTracks.slice(-10).reverse();
  } catch (error) {
    console.error("Error loading admin stats:", error);
  }

  return <AdminDashboard stats={stats} recentTracks={recentTracks} />;
}
