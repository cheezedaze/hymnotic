"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ActiveBannerAd {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

let cachedBannerAds: ActiveBannerAd[] | null = null;
let fetchPromise: Promise<ActiveBannerAd[]> | null = null;

function fetchBannerAds(): Promise<ActiveBannerAd[]> {
  if (cachedBannerAds) return Promise.resolve(cachedBannerAds);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/banner-ads")
    .then((res) => (res.ok ? res.json() : []))
    .then((data: ActiveBannerAd[]) => {
      cachedBannerAds = data;
      fetchPromise = null;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as ActiveBannerAd[];
    });

  return fetchPromise;
}

export function useActiveBannerAds() {
  const [bannerAds, setBannerAds] = useState<ActiveBannerAd[]>(
    cachedBannerAds ?? []
  );
  const [isLoading, setIsLoading] = useState(!cachedBannerAds);

  useEffect(() => {
    fetchBannerAds().then((data) => {
      setBannerAds(data);
      setIsLoading(false);
    });
  }, []);

  return { bannerAds, isLoading };
}

/**
 * Hook that returns a rotating banner ad, changing every `intervalMs`.
 * Cycles through all active banner ads sequentially.
 */
export function useRotatingBannerAd(intervalMs: number = 30000) {
  const { bannerAds, isLoading } = useActiveBannerAds();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (bannerAds.length <= 1) return;

    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % bannerAds.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bannerAds.length, intervalMs]);

  const currentBannerAd =
    bannerAds.length > 0 ? bannerAds[index % bannerAds.length] : null;

  return { currentBannerAd, bannerAds, isLoading };
}
