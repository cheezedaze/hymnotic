"use client";

import { motion } from "framer-motion";

export interface DonutSegment {
  label: string;
  value: number;
  /** Any CSS color: a token var like "var(--color-accent)" or a hex/rgb. */
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}

/**
 * Lightweight themed donut. Renders one stroked circle per segment with
 * cumulative dash offsets; animates each arc growing in. Dependency-free SVG.
 */
export function DonutChart({
  segments,
  size = 160,
  thickness = 18,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offsetAcc = 0;
  const arcs =
    total > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const fraction = s.value / total;
            const dash = fraction * circumference;
            const arc = {
              color: s.color,
              dash,
              gap: circumference - dash,
              // negative offset moves the arc start clockwise
              offset: -offsetAcc,
            };
            offsetAcc += dash;
            return arc;
          })
      : [];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={thickness}
          />
          {arcs.map((arc, i) => (
            <motion.circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: arc.offset }}
              transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.08 }}
            />
          ))}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <span className="text-2xl font-bold text-text-primary leading-none">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] uppercase tracking-wide text-text-muted mt-1">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {segments.map((s) => {
          const p = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-text-secondary flex-1">{s.label}</span>
              <span className="text-text-primary font-medium tabular-nums">
                {s.value.toLocaleString()}
              </span>
              <span className="text-text-dim tabular-nums w-9 text-right">
                {p}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BarStatProps {
  label: string;
  value: number;
  total: number;
  color?: string;
  sub?: string;
}

/**
 * Labeled horizontal bar showing value as a percentage of total. Used for
 * metrics that overlap or aren't slices of one whole (platforms, engagement).
 */
export function BarStat({
  label,
  value,
  total,
  color = "var(--color-accent)",
  sub,
}: BarStatProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-muted tabular-nums">
          <span className="text-text-primary font-medium">
            {value.toLocaleString()}
          </span>{" "}
          · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      {sub && <p className="text-[11px] text-text-dim">{sub}</p>}
    </div>
  );
}
