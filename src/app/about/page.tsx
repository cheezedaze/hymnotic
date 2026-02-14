import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <Image
        src="/images/think-celestial-hymnotic.svg"
        alt="Hymnotic"
        width={64}
        height={64}
        className="glow-gold mb-4"
      />
      <h1 className="text-display text-2xl font-bold text-text-primary mb-2">
        Hymnotic
      </h1>
      <p className="text-text-muted text-sm">
        Spiritual music for the soul. Coming soon.
      </p>
    </div>
  );
}
