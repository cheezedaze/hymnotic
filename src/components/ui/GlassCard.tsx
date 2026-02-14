import { cn } from "@/lib/utils/cn";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "heavy";
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  onClick,
}: GlassCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-card)] shadow-[var(--shadow-card)]",
        variant === "default" ? "glass" : "glass-heavy",
        onClick && "w-full text-left cursor-pointer",
        className
      )}
    >
      {children}
    </Comp>
  );
}
