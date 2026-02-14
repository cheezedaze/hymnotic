"use client";

import { cn } from "@/lib/utils/cn";

interface AdminTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function AdminTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  disabled = false,
  required = false,
  className,
}: AdminTextareaProps) {
  const id = `admin-textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder:text-text-dim",
          "bg-white/5 border border-white/10 backdrop-blur-sm",
          "outline-none transition-all duration-200 resize-y",
          "focus:border-accent/50 focus:ring-1 focus:ring-accent/25",
          "hover:border-white/20",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-red-400/50 focus:border-red-400/50 focus:ring-red-400/25"
        )}
      />
      {error && (
        <p className="text-xs text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
}
