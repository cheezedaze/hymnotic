import { getAllAnnouncements } from "@/lib/db/queries";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

export default async function AdminAnnouncementsPage() {
  const announcements = await getAllAnnouncements();
  return <AnnouncementsManager announcements={announcements} />;
}
