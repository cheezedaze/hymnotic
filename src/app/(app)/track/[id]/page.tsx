import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicTrack } from "@/lib/tracks/public-track";
import { trackUrl } from "@/lib/deep-links/urls";
import { TrackLanding } from "./TrackLanding";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await getPublicTrack(id);

  if (!track) {
    return { title: "Track Not Found | HYMNZ", robots: { index: false } };
  }

  const url = trackUrl(id);
  const artist = track.artist || "HYMNZ";
  const title = `${track.title} - ${artist}`;
  const description = `Listen to "${track.title}" by ${artist} on HYMNZ`;
  const image = { url: `${url}/opengraph-image`, width: 1200, height: 630, alt: `${track.title} — ${artist} | HYMNZ` };

  return {
    title: `${title} | HYMNZ`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: track.title,
      description: `${artist} | HYMNZ`,
      type: "music.song",
      url,
      siteName: "HYMNZ",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: track.title,
      description: `${artist} | HYMNZ`,
      images: [image],
    },
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = await getPublicTrack(id);

  if (!track) {
    notFound();
  }

  return <TrackLanding key={track.trackId} {...track} />;
}
