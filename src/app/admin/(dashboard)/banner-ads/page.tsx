import { getAllBannerAds } from "@/lib/db/queries";
import { BannerAdsManager } from "@/components/admin/BannerAdsManager";

export default async function AdminBannerAdsPage() {
  const bannerList = await getAllBannerAds();
  return <BannerAdsManager bannerAds={bannerList} />;
}
