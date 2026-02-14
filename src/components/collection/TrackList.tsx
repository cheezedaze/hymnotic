"use client";

import { type Track } from "@/lib/data/tracks";
import { TrackItem } from "./TrackItem";

interface TrackListProps {
  tracks: Track[];
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
