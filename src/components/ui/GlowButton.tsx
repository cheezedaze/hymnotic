import { cn } from "@/lib/utils/cn";

interface GlowButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "accent" | "gold";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const sizeClasses = {
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-14 h-14",
};

export function GlowButton({
  children,
  className,
  variant = "accent",
  size = "md",
  onClick,
}: GlowButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200 active:scale-95",
        sizeClasses[size],
        variant === "accent" && "bg-accent-50 glow-accent text-white",
        variant === "gold" && "bg-gold/20 glow-gold text-gold",
        className
      )}
    >
      {children}
    </button>
  );
}
