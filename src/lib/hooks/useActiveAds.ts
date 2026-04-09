"use client";

import { useState, useEffect } from "react";

interface ActiveAd {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

let cachedAds: ActiveAd[] | null = null;
let fetchPromise: Promise<ActiveAd[]> | null = null;

function fetchAds(): Promise<ActiveAd[]> {
  if (cachedAds) return Promise.resolve(cachedAds);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/ads")
    .then((res) => (res.ok ? res.json() : []))
    .then((data: ActiveAd[]) => {
      cachedAds = data;
      fetchPromise = null;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as ActiveAd[];
    });

  return fetchPromise;
}

export function useActiveAds() {
  const [ads, setAds] = useState<ActiveAd[]>(cachedAds ?? []);
  const [isLoading, setIsLoading] = useState(!cachedAds);

  useEffect(() => {
    fetchAds().then((data) => {
      setAds(data);
      setIsLoading(false);
    });
  }, []);

  return { ads, isLoading };
}

/**
 * Pick a deterministic ad for a given track ID.
 * Uses a simple hash so the same track always shows the same ad.
 */
export function getAdForTrack(ads: ActiveAd[], trackId: string): ActiveAd | null {
  if (ads.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash * 31 + trackId.charCodeAt(i)) | 0;
  }
  return ads[Math.abs(hash) % ads.length];
}
