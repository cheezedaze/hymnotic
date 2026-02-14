"use client";

import { Download, Share2, Shuffle, Play, Pause } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { GlowButton } from "@/components/ui/GlowButton";
import { usePlayerStore } from "@/lib/store/playerStore";
import { type Track } from "@/lib/data/tracks";

interface ActionRowProps {
  tracks: Track[];
}

export function ActionRow({ tracks }: ActionRowProps) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const isPlayingFromThisCollection =
    currentTrack && tracks.some((t) => t.id === currentTrack.id);

  const handlePlayAll = () => {
    if (isPlayingFromThisCollection) {
      togglePlayPause();
    } else {
      setQueue(tracks, 0);
    }
  };

  const handleShuffle = () => {
    toggleShuffle();
    if (!isPlayingFromThisCollection) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setQueue(tracks, randomIndex);
    }
  };

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2">
        <IconButton label="Download" size="sm">
          <Download size={18} />
        </IconButton>
        <IconButton label="Share" size="sm">
          <Share2 size={18} />
        </IconButton>
      </div>

      <div className="flex items-center gap-3">
        <IconButton
          label="Shuffle"
          active={shuffle}
          onClick={handleShuffle}
        >
          <Shuffle size={20} />
        </IconButton>
        <GlowButton size="lg" onClick={handlePlayAll}>
          {isPlayingFromThisCollection && isPlaying ? (
            <Pause size={24} fill="white" className="text-white" />
          ) : (
            <Play size={24} fill="white" className="text-white ml-0.5" />
          )}
        </GlowButton>
      </div>
    </div>
  );
}
