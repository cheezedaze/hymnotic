import { Header } from "@/components/layout/Header";
import { HeroCard } from "@/components/home/HeroCard";
import { SectionDivider } from "@/components/home/SectionDivider";
import { CollectionGrid } from "@/components/home/CollectionGrid";

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <Header />
      <div className="relative z-40">
        <HeroCard />
        <SectionDivider title="Collections" />
        <CollectionGrid />
      </div>
    </div>
  );
}
