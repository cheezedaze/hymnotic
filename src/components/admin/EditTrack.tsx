"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Save,
  Music,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { AdminFileUpload } from "./AdminFileUpload";
import { formatTime } from "@/lib/utils/formatTime";

interface LyricLine {
  id?: number;
  lineNumber: number;
  startTime: number;
  endTime: number;
  text: string;
  isChorus: boolean;
}

interface EditTrackProps {
  track: {
    id: string;
    collectionId: string;
    title: string;
    artist: string;
    artworkUrl: string | null;
    artworkKey: string | null;
    audioUrl: string | null;
    audioKey: string | null;
    audioFormat: string | null;
    videoUrl: string | null;
    videoKey: string | null;
    duration: number;
    trackNumber: number;
    playCount: number;
    favoriteCount: number;
    hasVideo: boolean;
    hasLyrics: boolean;
  };
  lyrics: LyricLine[];
  collections: Array<{ id: string; title: string }>;
}

export function EditTrack({ track, lyrics: initialLyrics, collections }: EditTrackProps) {
  const router = useRouter();

  // Track form
  const [form, setForm] = useState({
    title: track.title,
    artist: track.artist,
    collectionId: track.collectionId,
    duration: track.duration,
    trackNumber: track.trackNumber,
    artworkKey: track.artworkKey || "",
    audioKey: track.audioKey || "",
    audioFormat: track.audioFormat || "",
    videoKey: track.videoKey || "",
    hasVideo: track.hasVideo,
  });
  const [artworkPreview, setArtworkPreview] = useState(track.artworkUrl || "");
  const [audioUploaded, setAudioUploaded] = useState(!!track.audioUrl);
  const [videoUploaded, setVideoUploaded] = useState(!!track.videoUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Lyrics
  const [lyricLines, setLyricLines] = useState<LyricLine[]>(
    initialLyrics.length > 0
      ? initialLyrics
      : []
  );
  const [savingLyrics, setSavingLyrics] = useState(false);

  // Save track metadata
  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess("Track saved!");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Save lyrics
  const handleSaveLyrics = async () => {
    setSavingLyrics(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/tracks/${track.id}/lyrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lyricLines.map((line, i) => ({
            lineNumber: i + 1,
            startTime: line.startTime,
            endTime: line.endTime,
            text: line.text,
            isChorus: line.isChorus,
          })),
        }),
      });

      if (!res.ok) {
        setError("Failed to save lyrics");
        return;
      }

      setSuccess("Lyrics saved!");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSavingLyrics(false);
    }
  };

  // Add lyric line
  const addLyricLine = () => {
    const lastLine = lyricLines[lyricLines.length - 1];
    const newStart = lastLine ? lastLine.endTime : 0;
    setLyricLines([
      ...lyricLines,
      {
        lineNumber: lyricLines.length + 1,
        startTime: newStart,
        endTime: newStart + 10,
        text: "",
        isChorus: false,
      },
    ]);
  };

  const removeLyricLine = (index: number) => {
    setLyricLines(lyricLines.filter((_, i) => i !== index));
  };

  const updateLyricLine = (
    index: number,
    field: keyof LyricLine,
    value: string | number | boolean
  ) => {
    setLyricLines(
      lyricLines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/tracks")}
          className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-display text-xl font-bold text-text-primary">
            Edit Track
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            {track.id} · {track.playCount.toLocaleString()} plays
          </p>
        </div>
      </div>

      {/* Track metadata form */}
      <form
        onSubmit={handleSaveTrack}
        className="glass-heavy rounded-xl p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-text-primary">
          Track Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Artist
            </label>
            <input
              type="text"
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Collection *
            </label>
            <select
              value={form.collectionId}
              onChange={(e) =>
                setForm({ ...form, collectionId: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id} className="bg-midnight">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Duration (seconds) *
            </label>
            <input
              type="number"
              step="0.1"
              value={form.duration}
              onChange={(e) =>
                setForm({ ...form, duration: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-xs text-text-dim mt-1">
              {formatTime(form.duration)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Track Number
            </label>
            <input
              type="number"
              value={form.trackNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  trackNumber: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        {/* File uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Audio upload */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Audio File {audioUploaded && "✓"}
            </label>
            <AdminFileUpload
              label={audioUploaded ? "Replace audio" : "Upload audio"}
              accept="audio/*"
              folder="audio/tracks"
              onUploadComplete={({ key }) => {
                const ext = key.split(".").pop() || "mp3";
                setForm({ ...form, audioKey: key, audioFormat: ext });
                setAudioUploaded(true);
              }}
            />
          </div>

          {/* Artwork upload */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Song Artwork (Background)
            </label>
            <div className="flex items-start gap-3">
              {artworkPreview && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={artworkPreview}
                    alt="Art"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <AdminFileUpload
                label="Upload"
                accept="image/*"
                folder="images/artwork"
                onUploadComplete={({ key, cdnUrl }) => {
                  setForm({ ...form, artworkKey: key });
                  setArtworkPreview(cdnUrl);
                }}
              />
            </div>
          </div>

          {/* Video upload */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Background Video (optional) {videoUploaded && "✓"}
            </label>
            <AdminFileUpload
              label={videoUploaded ? "Replace video" : "Upload video"}
              accept="video/*"
              folder="video/tracks"
              onUploadComplete={({ key }) => {
                setForm({ ...form, videoKey: key, hasVideo: true });
                setVideoUploaded(true);
              }}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent/20 border border-accent/30 text-accent rounded-xl text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Track"}
        </button>
      </form>

      {/* Lyrics editor */}
      <div className="glass-heavy rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">
              Lyrics ({lyricLines.length} lines)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addLyricLine}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 text-text-secondary rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
            >
              <Plus size={12} />
              Add Line
            </button>
            <button
              onClick={handleSaveLyrics}
              disabled={savingLyrics}
              className="flex items-center gap-1 px-3 py-1.5 bg-accent/20 border border-accent/30 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
            >
              <Save size={12} />
              {savingLyrics ? "Saving..." : "Save Lyrics"}
            </button>
          </div>
        </div>

        {lyricLines.length === 0 ? (
          <div className="text-center py-6">
            <FileText size={24} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-muted text-sm">
              No lyrics yet. Click &quot;Add Line&quot; to start.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[60px_60px_1fr_60px_40px] gap-2 px-2 text-[10px] font-medium text-text-dim uppercase">
              <span>Start</span>
              <span>End</span>
              <span>Text</span>
              <span>Chorus</span>
              <span></span>
            </div>

            {lyricLines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-[60px_60px_1fr_60px_40px] gap-2 items-center"
              >
                <input
                  type="number"
                  step="0.1"
                  value={line.startTime}
                  onChange={(e) =>
                    updateLyricLine(
                      index,
                      "startTime",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
                <input
                  type="number"
                  step="0.1"
                  value={line.endTime}
                  onChange={(e) =>
                    updateLyricLine(
                      index,
                      "endTime",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) =>
                    updateLyricLine(index, "text", e.target.value)
                  }
                  placeholder="Lyric text..."
                  className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
                />
                <label className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={line.isChorus}
                    onChange={(e) =>
                      updateLyricLine(index, "isChorus", e.target.checked)
                    }
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
                  />
                </label>
                <button
                  onClick={() => removeLyricLine(index)}
                  className="p-1 rounded hover:bg-red-500/10 text-text-dim hover:text-red-400 transition-colors mx-auto"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
