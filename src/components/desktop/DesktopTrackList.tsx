"use client";

import { Music } from "lucide-react";
import { type ApiTrack } from "@/lib/types";
import { TrackItem } from "@/components/collection/TrackItem";

interface DesktopTrackListProps {
  tracks: ApiTrack[];
}

export function DesktopTrackList({ tracks }: DesktopTrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Music size={32} className="text-text-dim mb-3" />
        <p className="text-text-muted text-sm">No tracks found.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {tracks.map((track) => (
        <TrackItem key={track.id} track={track} queue={tracks} />
      ))}
    </div>
  );
}
