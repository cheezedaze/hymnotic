import { cn } from "@/lib/utils/cn";

interface IconButtonProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  label?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

export function IconButton({
  children,
  className,
  active = false,
  size = "md",
  onClick,
  label,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200 active:scale-95",
        sizeClasses[size],
        active
          ? "text-accent drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
          : "text-text-secondary hover:text-text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}
