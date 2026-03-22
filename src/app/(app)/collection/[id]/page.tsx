import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCollectionById,
  getTracksByCollection,
  getSacred7TracksWithDetails,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrlsWithFallback, getMediaUrl } from "@/lib/s3/client";
import {
  getAccessContext,
  getSacred7TrackIds,
  canPlayFullTrack,
  getPreviewDuration,
} from "@/lib/auth/access";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { CollectionContent } from "@/components/collection/CollectionContent";
import { FavoritesCollection } from "@/components/collection/FavoritesCollection";
import { AllTracksCollection } from "@/components/collection/AllTracksCollection";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ play?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  // Virtual collections get static metadata
  if (id === "all-tracks" || id === "favorites") {
    return {
      title: id === "all-tracks" ? "All Tracks | HYMNZ" : "Favorites | HYMNZ",
    };
  }

  const collection = await getCollectionById(id);
  if (!collection) {
    return { title: "Collection Not Found | HYMNZ" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hymnz.com";
  const artworkUrl = getMediaUrl(collection.artworkKey);
  const description = collection.description || `Listen to "${collection.title}" on HYMNZ`;

  return {
    title: `${collection.title} | HYMNZ`,
    description,
    openGraph: {
      title: collection.title,
      description,
      type: "music.album",
      url: `${appUrl}/collection/${id}`,
      siteName: "HYMNZ",
      ...(artworkUrl && {
        images: [
          { url: artworkUrl, width: 800, height: 800, alt: collection.title },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: collection.title,
      description,
      ...(artworkUrl && { images: [artworkUrl] }),
    },
  };
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { id } = await params;
  const { play: autoPlayTrackId } = await searchParams;

  // All Tracks: virtual collection showing every track
  if (id === "all-tracks") {
    return <AllTracksCollection />;
  }

  // Favorites collection: tracks are determined client-side
  if (id === "favorites") {
    const collection = await getCollectionById("favorites");
    const collectionWithUrls = collection
      ? { ...collection, ...buildCollectionMediaUrls(collection) }
      : null;
    return <FavoritesCollection collection={collectionWithUrls} />;
  }

  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  // Sacred 7 collections get tracks from junction table, not by collectionId
  const rawTracks = collection.isSacred7
    ? await getSacred7TracksWithDetails()
    : await getTracksByCollection(collection.id);

  // Access context for preview enforcement
  const access = await getAccessContext();
  const sacred7TrackIds = await getSacred7TrackIds();
  const previewDuration = getPreviewDuration(access.tier);

  // Resolve media URLs
  const collectionWithUrls = {
    ...collection,
    ...buildCollectionMediaUrls(collection),
  };

  const tracks = rawTracks.map((t) => {
    const isFull = canPlayFullTrack(access.tier, t.id, sacred7TrackIds);
    return {
      ...t,
      ...buildTrackMediaUrlsWithFallback(t, collection.artworkKey),
      isLocked: !isFull,
      previewDuration: isFull ? t.duration : previewDuration,
      isSacred7: sacred7TrackIds.includes(t.id),
    };
  });

  const trackCount = tracks.length;

  return (
    <div className="min-h-dvh">
      <CollectionHeader
        collection={collectionWithUrls}
        trackCount={trackCount}
      />
      <CollectionContent tracks={tracks} collectionId={collection.id} collectionTitle={collection.title} collectionArtworkUrl={collectionWithUrls.artworkUrl} autoPlayTrackId={autoPlayTrackId} />
    </div>
  );
}
