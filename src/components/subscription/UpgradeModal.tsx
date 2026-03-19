"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Music, ExternalLink, SkipForward } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { isNativeApp, openExternalBrowser } from "@/lib/utils/platform";

export function UpgradeModal() {
  const showUpgradeModal = usePlayerStore((s) => s.showUpgradeModal);
  const setShowUpgradeModal = usePlayerStore((s) => s.setShowUpgradeModal);
  const showPreviewActions = usePlayerStore((s) => s.showPreviewActions);
  const tryNextSong = usePlayerStore((s) => s.tryNextSong);

  const handleSubscribe = () => {
    if (isNativeApp()) {
      openExternalBrowser("https://hymnz.com/subscribe");
    } else {
      window.location.href = "/subscribe";
    }
    setShowUpgradeModal(false);
  };

  const handleDismiss = () => {
    setShowUpgradeModal(false);
  };

  return (
    <AnimatePresence>
      {showUpgradeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative glass-heavy rounded-3xl p-8 w-full max-w-sm text-center border border-white/10"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>

            {/* Try Next Song — shown after jingle plays */}
            {showPreviewActions && (
              <div className="mb-6">
                <button
                  onClick={tryNextSong}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors"
                >
                  <SkipForward size={16} />
                  Try the Next Song
                </button>
              </div>
            )}

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-5">
              <Music size={28} className="text-accent" />
            </div>

            <h2 className="text-display text-xl font-bold text-text-primary mb-2">
              Upgrade to HYMNZ Premium
            </h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Unlock full-length playback of every hymn in our catalog with no
              interruptions, exclusive releases, and more.
            </p>

            {isNativeApp() ? (
              <>
                <button
                  onClick={handleSubscribe}
                  className="w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 glow-accent"
                >
                  <ExternalLink size={16} />
                  Visit hymnz.com to Unlock
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSubscribe}
                  className="w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors glow-accent"
                >
                  Upgrade to Premium
                </button>
                <p className="text-text-dim text-xs mt-3">
                  Starting at $5.99/month
                </p>
              </>
            )}

            <button
              onClick={handleDismiss}
              className="text-text-muted text-sm mt-4 hover:text-text-secondary transition-colors"
            >
              Maybe Later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
