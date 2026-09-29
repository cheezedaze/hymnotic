import { cache } from "react";
import { getTrackById, getCollectionById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

/** Public display data only; playback access is resolved when Play is tapped. */
export const getPublicTrack = cache(async (id: string) => {
  const track = await getTrackById(id);
  if (!track?.isActive) return null;
  const collection = await getCollectionById(track.collectionId);
  return {
    trackId: track.id,
    title: track.title,
    artist: track.artist || "HYMNZ",
    artworkUrl: getMediaUrl(track.artworkKey) || getMediaUrl(collection?.artworkKey) || null,
    collectionId: collection?.id ?? null,
    collectionTitle: collection?.title ?? null,
  };
});
