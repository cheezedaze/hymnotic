"use client";

import { Music } from "lucide-react";
import { type ApiTrack } from "@/lib/types";
import { TrackItem } from "@/components/collection/TrackItem";

interface DesktopTrackListProps {
  tracks: ApiTrack[];
  selectedCollectionId: string | null;
  sacred7CollectionId?: string | null;
}

export function DesktopTrackList({
  tracks,
  selectedCollectionId,
  sacred7CollectionId,
}: DesktopTrackListProps) {
  const filtered = selectedCollectionId
    ? selectedCollectionId === sacred7CollectionId
      ? tracks.filter((t) => t.isSacred7)
      : tracks.filter((t) => t.collectionId === selectedCollectionId)
    : tracks;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Music size={32} className="text-text-dim mb-3" />
        <p className="text-text-muted text-sm">No tracks found.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {filtered.map((track) => (
        <TrackItem key={track.id} track={track} queue={filtered} />
      ))}
    </div>
  );
}
