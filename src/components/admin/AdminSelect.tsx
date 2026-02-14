"use client";

import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface AdminSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function AdminSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  error,
  disabled = false,
  required = false,
  className,
}: AdminSelectProps) {
  const id = `admin-select-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm text-text-primary appearance-none",
            "bg-white/5 border border-white/10 backdrop-blur-sm",
            "outline-none transition-all duration-200",
            "focus:border-accent/50 focus:ring-1 focus:ring-accent/25",
            "hover:border-white/20",
            !value && "text-text-dim",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-red-400/50 focus:border-red-400/50 focus:ring-red-400/25"
          )}
        >
          <option value="" disabled className="bg-midnight text-text-dim">
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-midnight text-text-primary"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
}
