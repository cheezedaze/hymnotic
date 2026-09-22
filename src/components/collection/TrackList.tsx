"use client";

import { type ApiTrack } from "@/lib/types";
import { TrackItem } from "./TrackItem";

interface TrackListProps {
  tracks: ApiTrack[];
  playbackQueue?: ApiTrack[];
  collectionId?: string;
}

export function TrackList({ tracks, playbackQueue = tracks, collectionId }: TrackListProps) {
  return (
    <div className="pb-4">
      {tracks.map((track) => (
        <TrackItem key={track.id} track={track} queue={playbackQueue} collectionId={collectionId} />
      ))}
    </div>
  );
}
