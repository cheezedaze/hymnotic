"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { AnnouncementAction } from "./AnnouncementAction";
import type { AnnouncementAction as Action } from "@/lib/announcements/actions";

interface AnnouncementData extends Partial<Action> {
  id: number;
  title: string;
  body: string;
  publishedAt: string | Date | null;
}

interface WhatsNewModalProps {
  announcement: AnnouncementData;
  onDismiss: () => void;
  onActionComplete?: (message: string) => void;
}

function formatDate(date: string | Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function WhatsNewModal({ announcement, onDismiss, onActionComplete }: WhatsNewModalProps) {
  return (
    <AnimatePresence>
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
          onClick={onDismiss}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative glass-heavy rounded-3xl p-8 w-full max-w-sm text-center border border-white/10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-title"
          style={{ maxHeight: "90dvh", overflowY: "auto" }}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-5">
            <Megaphone size={28} className="text-accent" />
          </div>

          <h2 id="announcement-title" className="text-display text-xl font-bold text-text-primary mb-1">
            What&apos;s New
          </h2>
          <p className="text-sm font-semibold text-accent">{announcement.title}</p>
          <p className="text-xs text-text-dim mt-1 mb-4">
            {formatDate(announcement.publishedAt)}
          </p>

          {/* Body content */}
          <div
            className="text-left max-h-60 overflow-y-auto mb-6 prose prose-invert prose-sm max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-text-secondary [&_ul]:text-text-secondary [&_ol]:text-text-secondary [&_a]:text-accent [&_img]:rounded-lg [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: announcement.body }}
          />

          <AnnouncementAction announcement={announcement} onComplete={onActionComplete ?? onDismiss} />
          <button
            onClick={onDismiss}
            className="w-full mt-2 py-3 text-text-muted rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
