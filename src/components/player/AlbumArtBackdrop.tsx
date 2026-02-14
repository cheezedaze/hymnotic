"use client";

import Image from "next/image";

interface AlbumArtBackdropProps {
  src: string;
  alt: string;
}

export function AlbumArtBackdrop({ src, alt }: AlbumArtBackdropProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover blur-[40px] scale-110"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-midnight/50 via-midnight/60 to-midnight/90" />
    </div>
  );
}
