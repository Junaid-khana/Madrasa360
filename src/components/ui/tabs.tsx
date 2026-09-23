"use client";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface TabItem { id: string; label: string; icon?: ReactNode; badge?: ReactNode; hidden?: boolean }

/** Horizontally scrollable tab bar; works on phones. */
export function Tabs({ tabs, value, onChange, className }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; className?: string }) {
  const t = useT();
  return (
    <div className={cn("scroll-thin -mx-4 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0", className)} role="tablist">
      <div className="flex min-w-max gap-1">
        {tabs.filter((x) => !x.hidden).map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id} role="tab" aria-selected={active} onClick={() => onChange(tab.id)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "border-brand-700 text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800",
              )}
            >
              {tab.icon}{t(tab.label)}{tab.badge}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pill-style segmented control, for small option sets like Present / Absent / Leave. */
export function Segmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("inline-flex rounded-lg bg-stone-100 p-1", className)} role="group">
      {options.map((o) => (
        <button
          key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", o.value === value ? "bg-white text-brand-800 shadow-sm" : "text-stone-600 hover:text-stone-900")}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}
