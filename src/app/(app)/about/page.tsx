import Image from "next/image";
import {
  Heart,
  BookOpen,
  Mail,
  Info,
  Star,
  Music,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { getActiveContentBlocksByPage } from "@/lib/db/queries";

const iconMap: Record<string, LucideIcon> = {
  Heart,
  BookOpen,
  Mail,
  Info,
  Star,
  Music,
  Sparkles,
};

const defaultBlocks = [
  {
    id: -1,
    sectionKey: "mission",
    title: "Our Mission",
    body: "Hymnotic is built to bring timeless hymns into a modern listening experience. We believe sacred music deserves the same care and presentation as any other genre \u2014 complete with synchronized lyrics, stunning artwork, and immersive backgrounds.",
    icon: "Heart",
  },
  {
    id: -2,
    sectionKey: "story",
    title: "The Story",
    body: "Born from a love of hymns and a desire to share them in new ways, Hymnotic curates collections of sacred songs paired with original arrangements and visual storytelling. Every track is crafted to help you connect, reflect, and find peace.",
    icon: "BookOpen",
  },
  {
    id: -3,
    sectionKey: "contact",
    title: "Get in Touch",
    body: "Have questions, feedback, or just want to say hello? We'd love to hear from you.",
    icon: "Mail",
  },
];

export default async function AboutPage() {
  let blocks: Awaited<ReturnType<typeof getActiveContentBlocksByPage>> = [];
  try {
    blocks = await getActiveContentBlocksByPage("about");
  } catch {
    blocks = [];
  }

  const sections = blocks.length > 0 ? blocks : defaultBlocks;

  return (
    <div className="min-h-dvh px-4 sm:px-6 pt-[calc(3rem+var(--safe-top))] pb-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Image
            src="/images/hymnotic-logo1.png"
            alt="Hymnotic"
            width={72}
            height={72}
            className="mx-auto"
          />
          <h1 className="text-display text-3xl font-bold text-text-primary">
            Hymnotic
          </h1>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
            Spiritual music for the soul — a place to experience sacred hymns
            with immersive audio and beautiful visuals.
          </p>
        </div>

        {/* Dynamic content blocks */}
        {sections.map((block, i) => {
          const IconComponent = iconMap[block.icon ?? ""] ?? Info;
          const iconColor = i % 2 === 0 ? "text-accent" : "text-gold";

          return (
            <div
              key={block.id}
              className="glass-heavy rounded-2xl p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <IconComponent size={16} className={iconColor} />
                <h2 className="text-display text-lg font-semibold text-text-primary">
                  {block.title}
                </h2>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                {block.body}
              </p>
              {block.sectionKey === "contact" && (
                <a
                  href="mailto:hello@hymnotic.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 border border-accent/25 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors"
                >
                  <Mail size={14} />
                  hello@hymnotic.com
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
