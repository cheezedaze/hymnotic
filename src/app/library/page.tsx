import { Library } from "lucide-react";

export default function LibraryPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <Library size={48} className="text-text-muted mb-4" />
      <h1 className="text-display text-2xl font-bold text-text-primary mb-2">
        My Library
      </h1>
      <p className="text-text-muted text-sm">
        Videos, artwork, and saved content. Coming soon.
      </p>
    </div>
  );
}
