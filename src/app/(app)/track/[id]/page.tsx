import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrackById, getCollectionById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";
import { TrackLanding } from "./TrackLanding";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track) {
    return { title: "Track Not Found | HYMNZ" };
  }

  const collection = track.collectionId
    ? await getCollectionById(track.collectionId)
    : null;

  const artworkUrl =
    getMediaUrl(track.artworkKey) ||
    getMediaUrl(collection?.artworkKey) ||
    null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hymnz.com";
  const artist = track.artist || "HYMNZ";
  const title = `${track.title} - ${artist}`;
  const description = `Listen to "${track.title}" by ${artist} on HYMNZ`;

  return {
    title: `${title} | HYMNZ`,
    description,
    openGraph: {
      title: track.title,
      description: `${artist} | HYMNZ`,
      type: "music.song",
      url: `${appUrl}/track/${id}`,
      siteName: "HYMNZ",
      ...(artworkUrl && {
        images: [
          { url: artworkUrl, width: 800, height: 800, alt: track.title },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: track.title,
      description: `${artist} | HYMNZ`,
      ...(artworkUrl && { images: [artworkUrl] }),
    },
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track) {
    notFound();
  }

  const collection = track.collectionId
    ? await getCollectionById(track.collectionId)
    : null;

  const artworkUrl =
    getMediaUrl(track.artworkKey) ||
    getMediaUrl(collection?.artworkKey) ||
    null;

  return (
    <TrackLanding
      trackId={track.id}
      title={track.title}
      artist={track.artist || "HYMNZ"}
      artworkUrl={artworkUrl}
      collectionId={track.collectionId}
      collectionTitle={collection?.title || null}
    />
  );
}
