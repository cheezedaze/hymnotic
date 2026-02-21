"use client";

import { useIsDesktop } from "@/lib/hooks/useIsDesktop";
import { HomeParallaxWrapper } from "./HomeParallaxWrapper";
import { HeroCard } from "./HeroCard";
import { SectionDivider } from "./SectionDivider";
import { CollectionGrid } from "./CollectionGrid";
import { DesktopHomePage } from "@/components/desktop/DesktopHomePage";
import { type ApiTrack, type ApiCollection } from "@/lib/types";

interface HomePageContentProps {
  collections: ApiCollection[];
  featuredTrack: ApiTrack | null;
  featuredQueue: ApiTrack[];
}

export function HomePageContent({
  collections,
  featuredTrack,
  featuredQueue,
}: HomePageContentProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <DesktopHomePage collections={collections} />;
  }

  return (
    <HomeParallaxWrapper>
      <HeroCard featuredTrack={featuredTrack} queue={featuredQueue} />
      <SectionDivider title="Collections" />
      <CollectionGrid collections={collections} />
    </HomeParallaxWrapper>
  );
}
