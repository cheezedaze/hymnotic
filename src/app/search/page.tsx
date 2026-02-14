import { Music } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <Music size={48} className="text-text-muted mb-4" />
      <h1 className="text-display text-2xl font-bold text-text-primary mb-2">
        Music Library
      </h1>
      <p className="text-text-muted text-sm">
        Search and browse all tracks. Coming soon.
      </p>
    </div>
  );
}
