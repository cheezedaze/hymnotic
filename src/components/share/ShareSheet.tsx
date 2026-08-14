"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, MessageCircle, Share2 } from "lucide-react";
import { useShareStore } from "@/lib/store/shareStore";
import { buildSharePayload } from "@/lib/share/shareData";
import { canUseSystemShare, shareWithSystem } from "@/lib/share/systemShare";
import { TrackShareCard } from "./TrackShareCard";

function TwitterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ShareSheet() {
  const isOpen = useShareStore((s) => s.isOpen);
  const shareData = useShareStore((s) => s.shareData);
  const closeShare = useShareStore((s) => s.closeShare);

  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showFallbacks, setShowFallbacks] = useState(
    () => !canUseSystemShare()
  );
  const [shareDataId, setShareDataId] = useState(shareData?.id);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const payload = shareData ? buildSharePayload(shareData) : null;

  if (shareDataId !== shareData?.id) {
    setShareDataId(shareData?.id);
    setCopied(false);
    setSharing(false);
    setShowFallbacks(!canUseSystemShare());
  }

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    return () => previouslyFocused?.focus();
  }, [isOpen]);

  const handleDialogKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeShare();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeShare]
  );

  const handleCopy = useCallback(async () => {
    if (!payload) return;

    try {
      await navigator.clipboard.writeText(payload.url);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = payload.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [payload]);

  const handleShare = useCallback(async () => {
    if (!payload || sharing) return;

    setSharing(true);
    const result = await shareWithSystem(payload);

    if (result === "shared") {
      closeShare();
    } else if (result === "failed" || result === "unavailable") {
      setShowFallbacks(true);
    }

    setSharing(false);
  }, [closeShare, payload, sharing]);

  const socialLinks = payload ? [
    {
      name: "X",
      icon: <TwitterIcon size={18} />,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`,
    },
    {
      name: "Facebook",
      icon: <FacebookIcon size={18} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`,
    },
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon size={18} />,
      href: `https://wa.me/?text=${encodeURIComponent(payload.text + " " + payload.url)}`,
    },
    {
      name: "Message",
      icon: <MessageCircle size={18} />,
      href: `sms:?body=${encodeURIComponent(payload.text + " " + payload.url)}`,
    },
  ] : [];

  return (
    <AnimatePresence>
      {isOpen && shareData && (
        <motion.div
          key="share-sheet"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={closeShare}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
            onKeyDown={handleDialogKeyDown}
            className="relative rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm border border-white/10 pb-8"
            style={{ background: "rgba(20, 26, 36, 1)" }}
          >
            <h2 id="share-sheet-title" className="sr-only">
              Share {shareData.title}
            </h2>

            {/* Close button */}
            <button
              ref={closeButtonRef}
              aria-label="Close share sheet"
              onClick={closeShare}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pr-8">
              <TrackShareCard data={shareData} />
            </div>

            {!showFallbacks && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-medium text-white transition-opacity disabled:opacity-60"
              >
                <Share2 size={16} />
                {sharing ? "Sharing…" : "Share…"}
              </button>
            )}

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent font-medium rounded-xl transition-colors mb-4"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy link
                </>
              )}
            </button>

            {showFallbacks && (
              <div className="flex items-center justify-center gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary"
                  >
                    {link.icon}
                    <span className="text-[10px] text-text-muted">
                      {link.name}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
