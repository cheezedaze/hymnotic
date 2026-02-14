interface SectionDividerProps {
  title: string;
}

export function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className="px-4 mt-[52px] mb-5">
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 gradient-divider rounded-full" />
        <h2 className="relative z-10 text-center text-xs font-semibold tracking-[0.25em] uppercase text-text-secondary">
          {title}
        </h2>
      </div>
    </div>
  );
}
