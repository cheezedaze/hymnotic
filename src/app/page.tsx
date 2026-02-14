import { Header } from "@/components/layout/Header";
import { HeroCard } from "@/components/home/HeroCard";
import { SectionDivider } from "@/components/home/SectionDivider";
import { CollectionGrid } from "@/components/home/CollectionGrid";
import {
  getAllCollections,
  getFeaturedContent,
  getTrackById,
  getTracksByCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrls } from "@/lib/s3/client";
import { type ApiTrack } from "@/lib/types";

export default async function HomePage() {
  const [collections, featured] = await Promise.all([
    getAllCollections(),
    getFeaturedContent(),
  ]);

  // Resolve collection media URLs
  const collectionsWithUrls = collections.map((c) => ({
    ...c,
    ...buildCollectionMediaUrls(c),
  }));

  // Get the featured track (first featured item of type "track")
  const featuredItem = featured.find((f) => f.type === "track");
  let featuredTrack: ApiTrack | null = null;
  let featuredQueue: ApiTrack[] = [];

  if (featuredItem) {
    const track = await getTrackById(featuredItem.referenceId);
    if (track) {
      featuredTrack = { ...track, ...buildTrackMediaUrls(track) };
      const queueTracks = await getTracksByCollection(track.collectionId);
      featuredQueue = queueTracks.map((t) => ({
        ...t,
        ...buildTrackMediaUrls(t),
      }));
    }
  }

  return (
    <div className="min-h-dvh">
      <Header />
      <div className="relative z-40">
        <HeroCard featuredTrack={featuredTrack} queue={featuredQueue} />
        <SectionDivider title="Collections" />
        <CollectionGrid collections={collectionsWithUrls} />
      </div>
    </div>
  );
}
