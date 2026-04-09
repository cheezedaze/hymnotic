import { getAllAds } from "@/lib/db/queries";
import { AdsManager } from "@/components/admin/AdsManager";

export default async function AdminAdsPage() {
  const adsList = await getAllAds();
  return <AdsManager ads={adsList} />;
}
