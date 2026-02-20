"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigationStore } from "@/lib/store/navigationStore";

/**
 * Renders a slide-in overlay that covers the screen during "forward" navigation
 * (e.g. tapping a collection card). The overlay slides in from the right, then
 * fades out once the new page has mounted — giving the impression of an instant
 * page transition without wrapping children in a transform (which would break
 * position:fixed elements like the parallax header).
 */
export function PageTransition() {
  const pathname = usePathname();
  const isTransitioning = useNavigationStore((s) => s.isTransitioning);
  const endTransition = useNavigationStore((s) => s.endTransition);
  const prevPathnameRef = useRef(pathname);

  // When the pathname changes, the new page has mounted — end the transition.
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Small delay so the new page renders at least one frame before we
      // reveal it (avoids a flash of unstyled content).
      const raf = requestAnimationFrame(() => {
        endTransition();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname, endTransition]);

  // Safety timeout — if navigation stalls, end the transition after 3s.
  useEffect(() => {
    if (!isTransitioning) return;
    const timeout = setTimeout(() => endTransition(), 3000);
    return () => clearTimeout(timeout);
  }, [isTransitioning, endTransition]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          key="page-transition-overlay"
          className="fixed inset-0 z-[60] bg-midnight"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ opacity: 0 }}
          transition={{
            x: { type: "tween", duration: 0.28, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.2, ease: "easeOut" },
          }}
        />
      )}
    </AnimatePresence>
  );
}
