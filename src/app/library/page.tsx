"use client";

import { useState } from "react";
import { Library, Video, Image as ImageIcon, Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { id: "videos", label: "Videos", icon: Video },
  { id: "artwork", label: "Artwork", icon: ImageIcon },
  { id: "favorites", label: "Favorites", icon: Heart },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("videos");

  return (
    <div className="min-h-dvh px-4 sm:px-6 py-8 pb-32">
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
        <div className="glass-heavy rounded-xl p-8 text-center">
          {activeTab === "videos" && (
            <>
              <Video size={32} className="text-text-dim mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                No Videos Yet
              </h3>
              <p className="text-text-muted text-xs max-w-xs mx-auto">
                Videos from tracks with background visuals will appear here.
              </p>
            </>
          )}
          {activeTab === "artwork" && (
            <>
              <ImageIcon size={32} className="text-text-dim mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                No Artwork Yet
              </h3>
              <p className="text-text-muted text-xs max-w-xs mx-auto">
                Collection artwork and track backgrounds will be browsable here.
              </p>
            </>
          )}
          {activeTab === "favorites" && (
            <>
              <Heart size={32} className="text-text-dim mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                No Favorites Yet
              </h3>
              <p className="text-text-muted text-xs max-w-xs mx-auto">
                Tap the heart on any track to save it to your favorites.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
