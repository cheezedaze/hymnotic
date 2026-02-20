import { getAllSettings } from "@/lib/db/queries";
import { SettingsManager } from "@/components/admin/SettingsManager";

export default async function AdminSettingsPage() {
  const settings = await getAllSettings();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return <SettingsManager settings={map} />;
}
