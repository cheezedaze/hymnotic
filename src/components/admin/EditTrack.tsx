"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Save,
  Plus,
  FileText,
} from "lucide-react";
import { AdminFileUpload, type UploadStatus } from "./AdminFileUpload";
import { AdminAudioPlayer } from "./AdminAudioPlayer";
import { LyricsImporter } from "./LyricsImporter";
import { LrcTimingEditor } from "./LrcTimingEditor";
import type { UseAdminAudioPlayerReturn } from "@/lib/hooks/useAdminAudioPlayer";
// Schedule inputs must initialize in the browser's time zone, not the server's.
const TrackReleasePanel = dynamic(() => import("./TrackReleasePanel").then((mod) => mod.TrackReleasePanel), { ssr: false });
import type { TrackRelease } from "@/lib/db/schema";

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
    originalAudioKey: string | null;
    originalAudioUrl: string | null;
    videoUrl: string | null;
    videoKey: string | null;
    duration: number;
    trackNumber: number;
    playCount: number;
    favoriteCount: number;
    isActive: boolean;
    publishedAt: Date | null;
    hasVideo: boolean;
    hasLyrics: boolean;
    youtubeUrl: string | null;
  };
  release?: TrackRelease | null;
  isNew?: boolean;
  lyrics: LyricLine[];
  collections: Array<{ id: string; title: string }>;
}

export function EditTrack({ track, lyrics: initialLyrics, collections, release = null, isNew = false }: EditTrackProps) {
  const router = useRouter();

  // Track form
  const [form, setForm] = useState({
    title: track.title,
    artist: track.artist,
    collectionId: track.collectionId,
    duration: track.duration,
    artworkKey: track.artworkKey || "",
    audioKey: track.audioKey || "",
    audioFormat: track.audioFormat || "",
    originalAudioKey: track.originalAudioKey || "",
    videoKey: track.videoKey || "",
    isActive: track.isActive,
    hasVideo: track.hasVideo,
    youtubeUrl: track.youtubeUrl || "",
  });
  const [savedForm, setSavedForm] = useState(JSON.stringify(form));
  const [released, setReleased] = useState(!!track.publishedAt);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const uploadInProgress = Object.values(uploadStatuses).includes("uploading");
  const audioUploadFailed = uploadStatuses.audio === "error";
  const releaseDisabledReason = uploadInProgress ? "Wait for uploads and audio conversion to finish."
    : audioUploadFailed ? "The audio upload failed. Upload it again before releasing this track."
    : !form.audioKey ? "Upload audio and save the track before releasing it."
    : savedForm !== JSON.stringify(form) ? "Save your track changes before releasing or updating the schedule."
    : "";
  const onReleased = useCallback(() => {
    setReleased(true);
    setForm((prev) => ({ ...prev, isActive: true }));
    setSavedForm((prev) => JSON.stringify({ ...JSON.parse(prev), isActive: true }));
    router.refresh();
  }, [router]);
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

  // Admin audio player (independent from global player)
  const audioPlayerRef = useRef<UseAdminAudioPlayerReturn | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Build audio URL: use track.audioUrl if available, otherwise null
  // After a new upload within this session, the audioKey changes but we don't
  // have a CDN URL for it yet until the track is saved and page refreshed.
  const audioUrl = track.audioUrl;

  // Import lyrics from pasted text
  const handleLyricsImport = (textLines: string[]) => {
    const newLines: LyricLine[] = textLines.map((text, i) => ({
      lineNumber: i + 1,
      startTime: -1,
      endTime: -1,
      text,
      isChorus: false,
    }));
    setLyricLines(newLines);
  };

  // Save track metadata
  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (uploadInProgress) { setError("Wait for uploads and conversion to finish before saving."); return; }
    if (form.isActive && audioUploadFailed) { setError("Resolve the failed audio upload before activating the track."); return; }
    setSaving(true);

    try {
      const { isActive, ...metadata } = form;
      const payload = !isNew && released && isActive !== JSON.parse(savedForm).isActive ? { ...metadata, isActive } : metadata;
      const res = await fetch(isNew ? "/api/admin/tracks" : `/api/admin/tracks/${track.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      const saved = await res.json();
      setSavedForm(JSON.stringify({ ...form, isActive: saved.isActive }));
      setForm((prev) => ({ ...prev, isActive: saved.isActive }));
      setReleased(!!saved.publishedAt);
      if (isNew) {
        router.replace(`/admin/tracks/${saved.id}#release`);
      } else {
        setSuccess("Track saved!");
      }
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
            startTime: Math.max(0, line.startTime),
            endTime: Math.max(0, line.endTime),
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
    const hasLastTime = lastLine && lastLine.endTime >= 0;
    setLyricLines([
      ...lyricLines,
      {
        lineNumber: lyricLines.length + 1,
        startTime: hasLastTime ? lastLine.endTime : -1,
        endTime: hasLastTime ? lastLine.endTime + 10 : -1,
        text: "",
        isChorus: false,
      },
    ]);
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
            {isNew ? "New Track" : "Edit Track"}
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            {isNew ? "Add the details below. New tracks stay inactive until released." : `${track.id} · ${track.playCount.toLocaleString()} plays`}
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
              required
              value={form.collectionId}
              onChange={(e) =>
                setForm({ ...form, collectionId: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            >
              <option value="" className="bg-midnight">Select a collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id} className="bg-midnight">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* YouTube URL */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            YouTube URL (optional)
          </label>
          <input
            type="url"
            value={form.youtubeUrl}
            onChange={(e) =>
              setForm({ ...form, youtubeUrl: e.target.value })
            }
            placeholder="https://youtu.be/..."
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
          />
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
              onStatusChange={(status) => setUploadStatuses((prev) => ({ ...prev, audio: status }))}
              maxSizeMB={150}
              onUploadComplete={({ key, audioDuration, originalKey, converted }) => {
                setForm((prev) => ({
                  ...prev,
                  audioKey: key,
                  audioFormat: converted ? "mp3" : (key.split(".").pop() || "mp3"),
                  originalAudioKey: originalKey || "",
                  ...(audioDuration != null && audioDuration > 0
                    ? { duration: Math.round(audioDuration * 10) / 10 }
                    : {}),
                }));
                setAudioUploaded(true);
              }}
            />
            {form.originalAudioKey && (
              <p className="text-xs text-accent mt-1">
                WAV original stored (converted to MP3 for playback)
              </p>
            )}
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
                onStatusChange={(status) => setUploadStatuses((prev) => ({ ...prev, artwork: status }))}
                onUploadComplete={({ key, cdnUrl }) => {
                  setForm((prev) => ({ ...prev, artworkKey: key }));
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
              onStatusChange={(status) => setUploadStatuses((prev) => ({ ...prev, video: status }))}
              onUploadComplete={({ key }) => {
                setForm((prev) => ({ ...prev, videoKey: key, hasVideo: true }));
                setVideoUploaded(true);
              }}
            />
          </div>
        </div>

        {/* Active toggle */}
        {released && <label className="flex items-center gap-3 cursor-pointer w-fit">
          <input
            type="checkbox"
            disabled={uploadInProgress || (!form.isActive && (audioUploadFailed || !form.audioKey))}
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 rounded accent-accent"
          />
          <span className="text-sm font-medium text-text-secondary">
            Active <span className="text-text-dim font-normal">(visible to users)</span>
          </span>
        </label>}
        {!released && <p className="text-sm text-text-muted">Inactive — use Release Track after saving to activate now or schedule a release.</p>}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={saving || uploadInProgress}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent/20 border border-accent/30 text-accent rounded-xl text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Track"}
        </button>
      </form>

      {!isNew && <TrackReleasePanel
        trackId={track.id} title={form.title} artworkUrl={artworkPreview}
        initialRelease={release} released={released} disabledReason={releaseDisabledReason} onReleased={onReleased}
      />}

      {isNew && <p className="text-sm text-text-muted">Save the track to prepare its release announcement, push notification, and release time.</p>}

      {/* Lyrics editor */}
      {!isNew && <div className="glass-heavy rounded-xl p-5 space-y-4">
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

        {/* Audio player for timing */}
        <AdminAudioPlayer
          audioUrl={audioUrl}
          duration={form.duration}
          onTimeUpdate={setAudioCurrentTime}
          audioPlayerRef={audioPlayerRef}
        />

        {/* Paste and import lyrics */}
        <LyricsImporter
          onImport={handleLyricsImport}
          existingLineCount={lyricLines.length}
        />

        {/* LRC timing grid */}
        {lyricLines.length > 0 ? (
          <LrcTimingEditor
            lines={lyricLines}
            onLinesChange={setLyricLines}
            getCurrentTime={() =>
              audioPlayerRef.current?.getCurrentTime() ?? 0
            }
            isAudioLoaded={audioPlayerRef.current?.state.isLoaded ?? false}
            trackDuration={form.duration}
            audioCurrentTime={audioCurrentTime}
          />
        ) : (
          <div className="text-center py-6">
            <FileText size={24} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-muted text-sm">
              No lyrics yet. Paste lyrics above or click &quot;Add Line&quot;.
            </p>
          </div>
        )}
      </div>}
    </div>
  );
}
