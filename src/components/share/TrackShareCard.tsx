/* eslint-disable @next/next/no-img-element -- The share card uses runtime artwork URLs and fixed card styling. */
import type { ShareData } from "@/lib/share/shareData";

export function TrackShareCard({ data }: { data: ShareData }) {
  const artist = data.type === "track" ? data.artist || "HYMNZ" : "HYMNZ";

  return (
    <div
      aria-label={`Share preview for ${data.title}`}
      className="relative flex aspect-[1200/630] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#26364a] to-[#0e151f] p-4 shadow-2xl"
    >
      <div className="aspect-square h-full shrink-0 overflow-hidden rounded-xl bg-white/5">
        {data.artworkUrl ? (
          <img
            src={data.artworkUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent/25 to-gold/20" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between pl-4 py-1">
        <div className="min-w-0">
          <p className="line-clamp-2 text-base font-bold text-white">{data.title}</p>
          <p className="mt-1 truncate text-xs text-white/65">{artist}</p>
        </div>
        <div className="flex items-center gap-2">
          <img src="/images/hymnz-logo2.png" alt="HYMNZ" className="h-7 w-auto" />
          <span className="text-[10px] font-medium text-white/60">Listen on HYMNZ</span>
        </div>
      </div>
    </div>
  );
}
