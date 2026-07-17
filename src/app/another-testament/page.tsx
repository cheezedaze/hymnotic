import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getTrackById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";
import { auth } from "@/lib/auth/auth";
import { PromoPlayer } from "@/components/promo/PromoPlayer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hymnz.com";
const YOUTUBE_ID = "-dkI0pXWc_w";
const YOUTUBE_URL = `https://youtu.be/${YOUTUBE_ID}`;
const ARTVUE_URL = "https://www.artvue.io/collection/6a582bfca898ff72c478af63";
const BOM_APP_URL =
  "https://www.churchofjesuschrist.org/learn/mobile-applications/book-of-mormon-app";
const BOM_FREE_COPY_URL =
  "https://www.churchofjesuschrist.org/comeuntochrist/ps/book-of-mormon-lesson";

export const metadata: Metadata = {
  title: "Another Testament of Jesus Christ — A Book of Mormon Trailer | HYMNZ",
  description:
    "A visual and musical testimony of the book that changed my life. Watch the cinematic Book of Mormon trailer, hear the epic hymn arrangement of Carry On, and explore the original artwork.",
  openGraph: {
    title: "Another Testament of Jesus Christ — A Book of Mormon Trailer",
    description:
      "A visual and musical testimony of the book that changed my life.",
    url: `${APP_URL}/another-testament`,
    siteName: "HYMNZ",
    type: "video.other",
    images: [
      {
        url: `${APP_URL}/images/promo/og-another-testament.jpg`,
        width: 1200,
        height: 630,
        alt: "Another Testament of Jesus Christ — original artwork",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ART = [
  { src: "/images/promo/moroni-hill.jpg", alt: "A glorious messenger among the trees" },
  { src: "/images/promo/jesus-blesses.jpg", alt: "Jesus blesses a child" },
  { src: "/images/promo/alma-friends.jpg", alt: "The heavens open" },
];

export default async function AnotherTestamentPage() {
  const [track, session] = await Promise.all([
    getTrackById("carry-on").catch(() => null),
    auth().catch(() => null),
  ]);
  const audioUrl = track ? `/api/promo/audio?track=${track.id}` : null;
  const artworkUrl = track ? getMediaUrl(track.artworkKey) : null;

  return (
    <div className="min-h-dvh bg-midnight">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/">
            <Image
              src="/images/hymnz-logo1.png"
              alt="HYMNZ"
              width={44}
              height={44}
              className="mb-4"
            />
          </Link>
          <h1 className="text-display text-3xl md:text-4xl font-bold text-text-primary">
            Another Testament of Jesus Christ
          </h1>
          <p className="text-text-secondary mt-2">A Book of Mormon Trailer</p>
          <p className="text-accent text-sm mt-3 italic">
            A visual and musical testimony of the book that changed my life.
          </p>
        </div>

        {/* Hero: video embed */}
        <section>
          <div className="aspect-video rounded-2xl overflow-hidden glass">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}?rel=0`}
              title="Another Testament of Jesus Christ — A Book of Mormon Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <p className="text-center mt-3">
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-text-muted text-sm hover:text-accent transition-colors"
            >
              Watch in 4K on YouTube <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </section>

        {/* Intro copy */}
        <section className="mt-8">
          <p className="text-text-secondary text-sm leading-relaxed text-center max-w-xl mx-auto">
            This cinematic trailer brings together three things close to my
            heart: the profound stories of the Book of Mormon, epic music, and
            original digital art. Every frame of artwork featured in this
            trailer is part of a larger collection celebrating scripture,
            light, and faith. The music was created for another passion project
            reimagining hymns in different genres&mdash;I arranged the hymn
            track first and built the entire trailer around it.
          </p>
        </section>

        <div className="gradient-divider my-10" />

        {/* The Music */}
        <section>
          <h2 className="text-display text-2xl font-bold text-text-primary text-center">
            The Music
          </h2>
          <p className="text-text-secondary text-sm text-center mt-2 mb-5 max-w-xl mx-auto">
            Featuring an epic hymn arrangement of &ldquo;Carry On&rdquo;
            exclusively on HYMNZ. Press play &mdash; the full arrangement, on
            the house.
          </p>
          {track && audioUrl && artworkUrl ? (
            <PromoPlayer
              trackId={track.id}
              title={track.title}
              artist={track.artist}
              audioUrl={audioUrl}
              artworkUrl={artworkUrl}
              isAuthenticated={!!session?.user}
            />
          ) : (
            <div className="glass rounded-2xl p-6 text-center text-text-muted text-sm">
              <Link href="/" className="text-accent hover:underline">
                Listen on HYMNZ
              </Link>
            </div>
          )}
          <p className="text-center text-text-secondary text-sm mt-4">
            Discover more uplifting, fun, motivating, and epic arrangements of
            sacred music on{" "}
            <Link href="/" className="text-accent hover:underline">
              HYMNZ
            </Link>
            .
          </p>
        </section>

        <div className="gradient-divider my-10" />

        {/* The Art */}
        <section>
          <h2 className="text-display text-2xl font-bold text-text-primary text-center">
            The Fine Art Collection
          </h2>
          <p className="text-text-secondary text-sm text-center mt-2 mb-5 max-w-xl mx-auto">
            Explore and collect the original artwork featured in this trailer
            on ArtVue.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ART.map((art) => (
              <a
                key={art.src}
                href={ARTVUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden group"
              >
                <Image
                  src={art.src}
                  alt={art.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
          <p className="text-center mt-4">
            <a
              href={ARTVUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent text-sm font-medium hover:underline"
            >
              View the collection on ArtVue{" "}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </section>

        <div className="gradient-divider my-10" />

        {/* Discover the Book of Mormon */}
        <section className="glass-heavy rounded-2xl p-6 md:p-8">
          <h2 className="text-display text-2xl font-bold text-text-primary text-center">
            Discover the Book of Mormon
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mt-4">
            The Book of Mormon has been a pivotal anchor in my life. When I
            first met with the missionaries and read it at the age of 20, my
            life did a complete 180. It has been the foundation of my faith in
            Jesus Christ for the 30 years since.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mt-3">
            If you&apos;ve never read it, or want to explore it deeper, you can
            download the app or request a free physical copy delivered right to
            your door.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <a
              href={BOM_FREE_COPY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-5 py-3 rounded-full bg-accent text-midnight text-sm font-semibold glow-accent"
            >
              Request a free copy
            </a>
            <a
              href={BOM_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-5 py-3 rounded-full glass text-text-primary text-sm font-semibold hover:text-accent transition-colors"
            >
              Download the app
            </a>
          </div>
        </section>

        {/* Credits + footer */}
        <div className="text-center mt-10 space-y-4">
          <p className="text-text-dim text-xs">
            &ldquo;Carry On&rdquo; &mdash; Lyrics: Ruth May Fox, 1853&ndash;1958.
            Music: A. Sherman Tingey, 1864&ndash;1924. &copy; 1948 IRI.
          </p>
          <p className="text-text-secondary text-sm">
            <Link href="/" className="text-accent hover:underline">
              Discover more sacred arrangements on HYMNZ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
