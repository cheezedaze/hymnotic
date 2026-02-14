"use client";

import { type ApiTrack } from "@/lib/types";
import { TrackItem } from "./TrackItem";

interface TrackListProps {
  tracks: ApiTrack[];
}

export function TrackList({ tracks }: TrackListProps) {
  return (
    <div className="pb-4">
      {tracks.map((track) => (
        <TrackItem key={track.id} track={track} queue={tracks} />
      ))}
    </div>
  );
}
