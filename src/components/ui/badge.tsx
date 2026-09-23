"use client";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Tone = "green" | "amber" | "red" | "blue" | "gray" | "gold";
const tones: Record<Tone, string> = {
  green: "bg-brand-50 text-brand-800 ring-brand-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  gray: "bg-stone-100 text-stone-700 ring-stone-200",
  gold: "bg-gold-100 text-gold-700 ring-amber-200",
};

export function Badge({ tone = "gray", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  Active: "green", Paid: "green", Approved: "green", Present: "green", Sent: "green", Completed: "green", Accepted: "green", Admitted: "green", Excellent: "green", Regular: "green",
  "Partially Paid": "amber", Pending: "amber", Queued: "amber", "In Progress": "amber", "Under Review": "amber", Good: "green", Average: "amber", "Needs attention": "amber", "Needs Improvement": "amber",
  Unpaid: "red", Rejected: "red", Failed: "red", Absent: "red", Weak: "red", Disabled: "red", "No recent record": "red",
  Archived: "gray", Left: "gray", Inactive: "gray", Waived: "blue", "Not Started": "gray", Graduated: "blue", New: "blue", Leave: "blue", "On leave": "blue",
};

/** Colour-coded, translated status pill. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useT();
  return <Badge tone={STATUS_TONE[status] ?? "gray"} className={className}>{t(status)}</Badge>;
}
