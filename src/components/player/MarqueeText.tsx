"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && measureRef.current) {
        setIsOverflowing(
          measureRef.current.scrollWidth > containerRef.current.clientWidth
        );
      }
    };

    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={cn("overflow-hidden relative", className)}>
      {/* Hidden measurement span (always rendered) */}
      <span
        ref={measureRef}
        className="invisible absolute top-0 left-0 whitespace-nowrap pointer-events-none"
        aria-hidden
      >
        {text}
      </span>

      {isOverflowing ? (
        <div
          className="inline-flex whitespace-nowrap"
          style={{
            animation: `marquee ${Math.max(text.length * 0.25, 6)}s linear infinite`,
          }}
        >
          <span className="pr-12">{text}</span>
          <span className="pr-12">{text}</span>
        </div>
      ) : (
        <span className="whitespace-nowrap block truncate">{text}</span>
      )}
    </div>
  );
}
