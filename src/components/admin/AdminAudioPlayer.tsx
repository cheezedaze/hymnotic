"use client";

import { useCallback, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import {
  useAdminAudioPlayer,
  type UseAdminAudioPlayerReturn,
} from "@/lib/hooks/useAdminAudioPlayer";
import { formatTime } from "@/lib/utils/formatTime";

interface AdminAudioPlayerProps {
  audioUrl: string | null;
  duration: number;
  onTimeUpdate?: (time: number) => void;
  audioPlayerRef?: React.MutableRefObject<UseAdminAudioPlayerReturn | null>;
}

export function AdminAudioPlayer({
  audioUrl,
  duration: fallbackDuration,
  onTimeUpdate,
  audioPlayerRef,
}: AdminAudioPlayerProps) {
  const player = useAdminAudioPlayer(audioUrl);
  const { state, togglePlayPause, seek } = player;

  // Expose player controls to parent
  useEffect(() => {
    if (audioPlayerRef) audioPlayerRef.current = player;
  }, [audioPlayerRef, player]);

  // Forward time updates to parent
  useEffect(() => {
    onTimeUpdate?.(state.currentTime);
  }, [state.currentTime, onTimeUpdate]);

  const duration = state.duration || fallbackDuration;
  const progress = duration > 0 ? (state.currentTime / duration) * 100 : 0;

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      seek(parseFloat(e.target.value));
    },
    [seek]
  );

  if (!audioUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 bg-white/5 border border-white/10 rounded-xl">
        <Volume2 size={14} className="text-text-dim" />
        <span className="text-xs text-text-dim">
          Upload audio to enable playback
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-white/5 border border-white/10 rounded-xl">
      {/* Play/Pause */}
      <button
        onClick={togglePlayPause}
        disabled={!state.isLoaded}
        className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
      >
        {state.isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Time */}
      <span className="text-xs text-text-secondary tabular-nums min-w-[80px]">
        {formatTime(state.currentTime)} / {formatTime(duration)}
      </span>

      {/* Seek bar */}
      <div className="relative flex-1 min-w-0">
        <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-accent rounded-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={state.currentTime}
          onChange={handleScrub}
          disabled={!state.isLoaded}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          style={{ height: "20px", marginTop: "-8px" }}
        />
      </div>
    </div>
  );
}
