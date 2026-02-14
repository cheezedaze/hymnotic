import Image from "next/image";
import { Heart, BookOpen, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-dvh px-4 sm:px-6 py-12 pb-32">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Image
            src="/images/think-celestial-hymnotic.svg"
            alt="Hymnotic"
            width={72}
            height={72}
            className="glow-gold mx-auto"
          />
          <h1 className="text-display text-3xl font-bold text-text-primary">
            Hymnotic
          </h1>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
            Spiritual music for the soul — a place to experience sacred hymns
            with immersive audio and beautiful visuals.
          </p>
        </div>

        {/* Mission */}
        <div className="glass-heavy rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-accent" />
            <h2 className="text-display text-lg font-semibold text-text-primary">
              Our Mission
            </h2>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">
            Hymnotic is built to bring timeless hymns into a modern listening
            experience. We believe sacred music deserves the same care and
            presentation as any other genre — complete with synchronized lyrics,
            stunning artwork, and immersive backgrounds.
          </p>
        </div>

        {/* Story */}
        <div className="glass-heavy rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-gold" />
            <h2 className="text-display text-lg font-semibold text-text-primary">
              The Story
            </h2>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">
            Born from a love of hymns and a desire to share them in new ways,
            Hymnotic curates collections of sacred songs paired with original
            arrangements and visual storytelling. Every track is crafted to help
            you connect, reflect, and find peace.
          </p>
        </div>

        {/* Contact */}
        <div className="glass-heavy rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-accent" />
            <h2 className="text-display text-lg font-semibold text-text-primary">
              Get in Touch
            </h2>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">
            Have questions, feedback, or just want to say hello? We&apos;d love
            to hear from you.
          </p>
          <a
            href="mailto:hello@hymnotic.com"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 border border-accent/25 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors"
          >
            <Mail size={14} />
            hello@hymnotic.com
          </a>
        </div>
      </div>
    </div>
  );
}
