"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  publishedAt: Date | string | null;
}

interface UpdatesListProps {
  announcements: AnnouncementItem[];
}

function formatDate(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UpdatesList({ announcements }: UpdatesListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (announcements.length === 0) {
    return <p className="text-text-dim text-sm">No updates yet.</p>;
  }

  const visible = showAll ? announcements : announcements.slice(0, 5);

  return (
    <div className="space-y-1.5">
      {visible.map((a) => {
        const isExpanded = expandedId === a.id;

        return (
          <div key={a.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {a.title}
                </p>
                <p className="text-xs text-text-dim">
                  {formatDate(a.publishedAt)}
                </p>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-text-muted" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-3 pb-3 prose prose-invert prose-sm max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-text-secondary [&_ul]:text-text-secondary [&_ol]:text-text-secondary [&_a]:text-accent [&_img]:rounded-lg [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: a.body }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {!showAll && announcements.length > 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-accent hover:text-accent/80 transition-colors px-3 py-1"
        >
          Show all {announcements.length} updates
        </button>
      )}
    </div>
  );
}
