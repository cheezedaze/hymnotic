"use client";

import { useIsDesktop } from "@/lib/hooks/useIsDesktop";
import { HomeParallaxWrapper } from "./HomeParallaxWrapper";
import { HeroCard } from "./HeroCard";
import { SectionDivider } from "./SectionDivider";
import { CollectionGrid } from "./CollectionGrid";
import { DesktopHomePage } from "@/components/desktop/DesktopHomePage";
import { type ApiTrack, type ApiCollection } from "@/lib/types";
import { type UserTier } from "@/lib/store/subscriptionStore";

interface HomePageContentProps {
  collections: ApiCollection[];
  featuredTrack: ApiTrack | null;
  featuredQueue: ApiTrack[];
  serverTier?: UserTier;
}

export function HomePageContent({
  collections,
  featuredTrack,
  featuredQueue,
  serverTier,
}: HomePageContentProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <DesktopHomePage
        collections={collections}
        serverTier={serverTier}
        featuredTrack={featuredTrack}
        featuredQueue={featuredQueue}
      />
    );
  }

  return (
    <HomeParallaxWrapper>
      <HeroCard featuredTrack={featuredTrack} queue={featuredQueue} />
      <SectionDivider title="Collections" />
      <CollectionGrid collections={collections} serverTier={serverTier} />
    </HomeParallaxWrapper>
  );
}
