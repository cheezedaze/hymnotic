import { User } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <User size={48} className="text-text-muted mb-4" />
      <h1 className="text-display text-2xl font-bold text-text-primary mb-2">
        Profile
      </h1>
      <p className="text-text-muted text-sm">
        User settings and subscription. Coming soon.
      </p>
    </div>
  );
}
