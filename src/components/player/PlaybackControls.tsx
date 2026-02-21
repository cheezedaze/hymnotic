"use client";

import { useCallback } from "react";
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
} from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { seekAudio } from "@/lib/audio/audioContext";
import { IconButton } from "@/components/ui/IconButton";
import { formatTime } from "@/lib/utils/formatTime";
import { cn } from "@/lib/utils/cn";

interface PlaybackControlsProps {
  compact?: boolean;
  variant?: "mobile" | "desktop";
}

export function PlaybackControls({ compact = false, variant = "mobile" }: PlaybackControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekAudio(time);
    usePlayerStore.getState().seekTo(time);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (variant === "desktop") {
    return (
      <div className="flex items-center gap-4 w-full">
        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <IconButton
            onClick={toggleShuffle}
            active={shuffle}
            size="sm"
            label="Shuffle"
          >
            <Shuffle size={16} />
          </IconButton>

          <IconButton onClick={previous} size="sm" label="Previous">
            <SkipBack size={18} fill="white" className="text-white" />
          </IconButton>

          <button
            onClick={togglePlayPause}
            className="w-9 h-9 rounded-full bg-accent-50 flex items-center justify-center glow-accent active:scale-95 transition-transform mx-1"
          >
            {isPlaying ? (
              <Pause size={18} fill="white" className="text-white" />
            ) : (
              <Play size={18} fill="white" className="text-white ml-0.5" />
            )}
          </button>

          <IconButton onClick={next} size="sm" label="Next">
            <SkipForward size={18} fill="white" className="text-white" />
          </IconButton>

          <IconButton
            onClick={cycleRepeat}
            active={repeat !== "off"}
            size="sm"
            label="Repeat"
          >
            {repeat === "one" ? (
              <Repeat1 size={16} />
            ) : (
              <Repeat size={16} />
            )}
          </IconButton>
        </div>

        {/* Time + Scrubber */}
        <span className="text-[11px] text-text-muted tabular-nums w-10 text-right shrink-0">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 min-w-0">
          <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-accent rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleScrub}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ height: "20px", marginTop: "-8px" }}
          />
        </div>

        <span className="text-[11px] text-text-muted tabular-nums w-10 shrink-0">
          {formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", compact ? "px-4 pb-2" : "px-6 pb-4")}>
      {/* Scrubber */}
      <div className="relative mb-1">
        <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-accent rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleScrub}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: "20px", marginTop: "-8px" }}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-[11px] text-text-muted mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-between">
        <IconButton
          onClick={toggleShuffle}
          active={shuffle}
          size="sm"
          label="Shuffle"
        >
          <Shuffle size={compact ? 18 : 20} />
        </IconButton>

        <IconButton onClick={previous} size="md" label="Previous">
          <SkipBack size={compact ? 22 : 26} fill="white" className="text-white" />
        </IconButton>

        <button
          onClick={togglePlayPause}
          className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center glow-accent active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <Pause size={28} fill="white" className="text-white" />
          ) : (
            <Play size={28} fill="white" className="text-white ml-1" />
          )}
        </button>

        <IconButton onClick={next} size="md" label="Next">
          <SkipForward size={compact ? 22 : 26} fill="white" className="text-white" />
        </IconButton>

        <IconButton
          onClick={cycleRepeat}
          active={repeat !== "off"}
          size="sm"
          label="Repeat"
        >
          {repeat === "one" ? (
            <Repeat1 size={compact ? 18 : 20} />
          ) : (
            <Repeat size={compact ? 18 : 20} />
          )}
        </IconButton>
      </div>
    </div>
  );
}
