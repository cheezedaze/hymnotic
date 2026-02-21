"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Library,
  Video,
  Image as ImageIcon,
  Music,
  Play,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type ApiCollection } from "@/lib/types";
import {
  extractYouTubeId,
  buildYouTubeThumbnail,
} from "@/lib/utils/youtube";

const tabs = [
  { id: "videos", label: "Videos", icon: Video },
  { id: "artwork", label: "Artwork", icon: ImageIcon },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ---------------------------------------------------------------------------
// Videos Tab
// ---------------------------------------------------------------------------
function VideosTab() {
  const [videos, setVideos] = useState<
    { id: number | string; title: string; youtubeUrl: string; thumbnailUrl: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-text-muted text-sm">Loading videos...</p>;
  }

  if (videos.length === 0) {
    return (
      <>
        <Video size={32} className="text-text-dim mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          No Videos Yet
        </h3>
        <p className="text-text-muted text-xs max-w-xs mx-auto">
          Videos will appear here when added.
        </p>
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-left">
      {videos.map((video) => {
        const ytId = extractYouTubeId(video.youtubeUrl);
        const thumb =
          video.thumbnailUrl ||
          (ytId ? buildYouTubeThumbnail(ytId) : null);
        return (
          <a
            key={video.id}
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform"
          >
            <div className="aspect-video relative bg-white/5">
              {thumb ? (
                <Image
                  src={thumb}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video size={24} className="text-text-dim" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Play size={18} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-medium text-text-primary truncate">
                {video.title}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Artwork Tab
// ---------------------------------------------------------------------------
function ArtworkTab() {
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [artvueUrl, setArtvueUrl] = useState<string | null>(null);
  const [artvueText, setArtvueText] = useState(
    "Get this artwork on your TV at Artvue.io"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/collections").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([cols, settings]) => {
        setCollections(Array.isArray(cols) ? cols : []);
        setArtvueUrl(settings.artvue_link_url || null);
        setArtvueText(
          settings.artvue_link_text ||
            "Get this artwork on your TV at Artvue.io"
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-text-muted text-sm">Loading artwork...</p>;
  }

  const artworkCollections = collections.filter((c) => c.artworkUrl);

  return (
    <div className="space-y-4 text-left">
      {artvueUrl && (
        <a
          href={artvueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 glass rounded-xl text-sm text-accent border border-accent/20 hover:bg-accent/10 transition-colors"
        >
          <ExternalLink size={14} />
          {artvueText}
        </a>
      )}

      {artworkCollections.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {artworkCollections.map((c) => (
            <div
              key={c.id}
              className="relative aspect-square rounded-xl overflow-hidden group"
            >
              <Image
                src={c.artworkUrl!}
                alt={c.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-xs font-semibold text-white truncate">
                  {c.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <ImageIcon size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-xs">
            No collection artwork yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Library Page
// ---------------------------------------------------------------------------
export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("videos");

  return (
    <div className="min-h-dvh px-4 sm:px-6 pt-[calc(2rem+var(--safe-top))] pb-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Library size={18} className="text-accent" />
          <h1 className="text-display text-2xl font-bold text-text-primary">
            My Library
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 flex-1 justify-center px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/5"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="glass-heavy rounded-xl p-8">
          {activeTab === "videos" && <VideosTab />}
          {activeTab === "artwork" && <ArtworkTab />}
        </div>
      </div>
    </div>
  );
}
