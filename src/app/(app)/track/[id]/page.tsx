import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrackById, getCollectionById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";
import {
  buildShareUrl,
  buildTrackShareImageUrl,
} from "@/lib/share/shareData";
import { TrackLanding } from "./TrackLanding";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track || !track.isActive) {
    return { title: "Track Not Found | HYMNZ" };
  }

  const artist = track.artist || "HYMNZ";
  const title = `${track.title} - ${artist}`;
  const description = `Listen to "${track.title}" by ${artist} on HYMNZ`;
  const shareData = {
    type: "track" as const,
    id: track.id,
    title: track.title,
    artist,
  };
  const canonicalUrl = buildShareUrl(shareData);
  const shareImageUrl = buildTrackShareImageUrl(track.id);
  const shareImage = {
    url: shareImageUrl,
    width: 1200,
    height: 630,
    alt: `${track.title} by ${artist}`,
  };

  return {
    title: `${title} | HYMNZ`,
    description,
    openGraph: {
      title: track.title,
      description: `${artist} | HYMNZ`,
      type: "music.song",
      url: canonicalUrl,
      siteName: "HYMNZ",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: track.title,
      description: `${artist} | HYMNZ`,
      images: [shareImage],
    },
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track || !track.isActive) {
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
