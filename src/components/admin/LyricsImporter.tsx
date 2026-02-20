"use client";

import { useState } from "react";
import { FileText, AlertTriangle } from "lucide-react";

interface LyricsImporterProps {
  onImport: (lines: string[]) => void;
  existingLineCount: number;
}

export function LyricsImporter({
  onImport,
  existingLineCount,
}: LyricsImporterProps) {
  const [text, setText] = useState("");
  const [imported, setImported] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const parsedLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const handleImport = () => {
    if (existingLineCount > 0 && !showWarning) {
      setShowWarning(true);
      return;
    }
    onImport(parsedLines);
    setImported(true);
    setShowWarning(false);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setImported(false);
          setShowWarning(false);
        }}
        placeholder="Paste lyrics here, one line per lyric line..."
        rows={8}
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors font-mono leading-relaxed resize-y"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleImport}
          disabled={parsedLines.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 border border-accent/30 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText size={12} />
          {imported ? "Re-import Lyrics" : "Import Lyrics"}
        </button>

        {parsedLines.length > 0 && (
          <span className="text-xs text-text-muted">
            {parsedLines.length} lines detected
          </span>
        )}

        {showWarning && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400">
            <AlertTriangle size={12} />
            <span>
              This will replace {existingLineCount} existing lines.
            </span>
            <button
              onClick={() => {
                onImport(parsedLines);
                setImported(true);
                setShowWarning(false);
              }}
              className="underline hover:text-yellow-300"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="underline hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
