"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Timer, Trash2, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatTimePrecise, parseTimeInput } from "@/lib/utils/formatTime";

interface LyricLine {
  id?: number;
  lineNumber: number;
  startTime: number;
  endTime: number;
  text: string;
  isChorus: boolean;
}

interface LrcTimingEditorProps {
  lines: LyricLine[];
  onLinesChange: (lines: LyricLine[]) => void;
  getCurrentTime: () => number;
  isAudioLoaded: boolean;
  trackDuration: number;
  audioCurrentTime: number;
}

export function LrcTimingEditor({
  lines,
  onLinesChange,
  getCurrentTime,
  isAudioLoaded,
  trackDuration,
  audioCurrentTime,
}: LrcTimingEditorProps) {
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [manualEndOverrides, setManualEndOverrides] = useState<Set<number>>(
    () => new Set()
  );
  const [stampedIndex, setStampedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Find which line is currently playing based on audio time
  const playingLineIndex = (() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startTime >= 0 && audioCurrentTime >= lines[i].startTime)
        return i;
    }
    return -1;
  })();

  // Auto-recalculate end times when start times change
  const recalculateEndTimes = useCallback(
    (updated: LyricLine[]): LyricLine[] => {
      return updated.map((line, i) => {
        if (manualEndOverrides.has(i)) return line;
        const nextStart = updated[i + 1]?.startTime;
        const autoEnd =
          nextStart !== undefined && nextStart >= 0
            ? nextStart
            : i === updated.length - 1 && line.startTime >= 0
              ? trackDuration
              : line.endTime;
        return { ...line, endTime: autoEnd };
      });
    },
    [manualEndOverrides, trackDuration]
  );

  // Stamp the active line's start time
  const stampLine = useCallback(
    (index: number) => {
      if (!isAudioLoaded || index < 0 || index >= lines.length) return;

      const time = Math.round(getCurrentTime() * 10) / 10; // round to 0.1s
      const updated = lines.map((line, i) =>
        i === index ? { ...line, startTime: time } : line
      );
      onLinesChange(recalculateEndTimes(updated));

      // Visual feedback
      setStampedIndex(index);
      setTimeout(() => setStampedIndex(null), 600);

      // Auto-advance
      if (index < lines.length - 1) {
        setActiveLineIndex(index + 1);
        lineRefs.current[index + 1]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    },
    [isAudioLoaded, lines, getCurrentTime, onLinesChange, recalculateEndTimes]
  );

  // Update a single line field
  const updateLine = useCallback(
    (index: number, field: keyof LyricLine, value: string | number | boolean) => {
      const updated = lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      );

      if (field === "endTime") {
        setManualEndOverrides((prev) => new Set(prev).add(index));
        onLinesChange(updated);
      } else if (field === "startTime") {
        onLinesChange(recalculateEndTimes(updated));
      } else {
        onLinesChange(updated);
      }
    },
    [lines, onLinesChange, recalculateEndTimes]
  );

  const removeLine = useCallback(
    (index: number) => {
      const updated = lines.filter((_, i) => i !== index);
      onLinesChange(recalculateEndTimes(updated));
      setManualEndOverrides((prev) => {
        const next = new Set<number>();
        prev.forEach((i) => {
          if (i < index) next.add(i);
          else if (i > index) next.add(i - 1);
        });
        return next;
      });
      if (activeLineIndex >= updated.length) {
        setActiveLineIndex(Math.max(0, updated.length - 1));
      }
    },
    [lines, onLinesChange, recalculateEndTimes, activeLineIndex]
  );

  const clearAllTimes = useCallback(() => {
    const updated = lines.map((line) => ({
      ...line,
      startTime: -1,
      endTime: -1,
    }));
    onLinesChange(updated);
    setManualEndOverrides(new Set());
    setActiveLineIndex(0);
  }, [lines, onLinesChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        container.focus();
        return;
      }

      if (isInput) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        stampLine(activeLineIndex);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(activeLineIndex + 1, lines.length - 1);
        setActiveLineIndex(next);
        lineRefs.current[next]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(activeLineIndex - 1, 0);
        setActiveLineIndex(prev);
        lineRefs.current[prev]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [activeLineIndex, lines.length, stampLine]);

  if (lines.length === 0) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="space-y-2 focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-dim">
          Click a line or use Arrow keys to select, then press{" "}
          <kbd className="px-1 py-0.5 bg-white/10 rounded text-text-muted">
            Enter
          </kbd>{" "}
          or{" "}
          <kbd className="px-1 py-0.5 bg-white/10 rounded text-text-muted">
            Space
          </kbd>{" "}
          to stamp the current time
        </p>
        <button
          onClick={clearAllTimes}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-dim hover:text-text-muted transition-colors"
        >
          <RotateCcw size={10} />
          Clear Times
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[32px_56px_72px_72px_1fr_48px_32px] gap-1.5 px-2 text-[10px] font-medium text-text-dim uppercase">
        <span>#</span>
        <span>Stamp</span>
        <span>Start</span>
        <span>End</span>
        <span>Text</span>
        <span className="text-center">Chorus</span>
        <span></span>
      </div>

      {/* Lines */}
      <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
        {lines.map((line, index) => {
          const isActive = index === activeLineIndex;
          const isPlaying = index === playingLineIndex;
          const isStamped = index === stampedIndex;
          const hasTime = line.startTime >= 0;

          return (
            <div
              key={index}
              ref={(el) => {
                lineRefs.current[index] = el;
              }}
              onClick={() => setActiveLineIndex(index)}
              className={cn(
                "grid grid-cols-[32px_56px_72px_72px_1fr_48px_32px] gap-1.5 items-center py-1 px-2 rounded-lg cursor-pointer transition-all duration-150",
                isActive && "border-l-2 border-accent bg-accent/5",
                !isActive && isPlaying && "bg-white/5",
                !isActive && !isPlaying && "hover:bg-white/3"
              )}
            >
              {/* Line number */}
              <span className="text-[10px] text-text-dim tabular-nums">
                {index + 1}
              </span>

              {/* Stamp button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stampLine(index);
                }}
                disabled={!isAudioLoaded}
                className={cn(
                  "flex items-center justify-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-medium transition-all",
                  isStamped
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : isActive
                      ? "bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30"
                      : "bg-white/5 text-text-dim border border-white/10 hover:bg-white/10",
                  "disabled:opacity-30 disabled:cursor-not-allowed"
                )}
              >
                {isStamped ? <Check size={10} /> : <Timer size={10} />}
                <span>{isStamped ? "" : "Set"}</span>
              </button>

              {/* Start time */}
              <TimeInput
                value={line.startTime}
                onChange={(val) => updateLine(index, "startTime", val)}
                hasValue={hasTime}
              />

              {/* End time */}
              <TimeInput
                value={line.endTime}
                onChange={(val) => updateLine(index, "endTime", val)}
                hasValue={line.endTime >= 0}
                isAuto={!manualEndOverrides.has(index)}
              />

              {/* Text */}
              <input
                type="text"
                value={line.text}
                onChange={(e) => updateLine(index, "text", e.target.value)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors truncate"
              />

              {/* Chorus */}
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={line.isChorus}
                  onChange={(e) =>
                    updateLine(index, "isChorus", e.target.checked)
                  }
                  className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
                />
              </label>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLine(index);
                }}
                className="p-1 rounded hover:bg-red-500/10 text-text-dim hover:text-red-400 transition-colors mx-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-component for time inputs with formatted display
function TimeInput({
  value,
  onChange,
  hasValue,
  isAuto,
}: {
  value: number;
  onChange: (val: number) => void;
  hasValue: boolean;
  isAuto?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const startEdit = () => {
    setEditText(formatTimePrecise(value));
    setEditing(true);
  };

  const commitEdit = () => {
    onChange(parseTimeInput(editText));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitEdit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className="px-1.5 py-1 bg-white/10 border border-accent/50 rounded text-xs text-text-primary text-center tabular-nums focus:outline-none w-full"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        "px-1.5 py-1 rounded text-xs tabular-nums text-center transition-colors w-full",
        hasValue
          ? "text-text-secondary hover:bg-white/10"
          : "text-text-dim hover:bg-white/5",
        isAuto && hasValue && "italic"
      )}
    >
      {hasValue ? formatTimePrecise(value) : "—"}
    </button>
  );
}
