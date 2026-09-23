"use client";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({ title, description, action, icon, className }: { title?: string; description?: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-12 text-center", className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">{icon ?? <Inbox className="size-6" />}</div>
      <p className="font-medium text-stone-800">{t(title ?? "No records found")}</p>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{t(description ?? "Nothing to show yet.")}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center" role="alert">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertTriangle className="size-6" /></div>
      <p className="font-medium text-stone-800">{t("Something went wrong")}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-stone-500">{message}</p>}
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>{t("Try again")}</Button>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-stone-200/70", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-brand-700", className)} aria-label="Loading" />;
}

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const dim = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-3xl" }[size];
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={name} className={cn("shrink-0 rounded-full object-cover", dim, className)} />;
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800", dim, className)}>
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, className, tone = "green" }: { value: number; className?: string; tone?: "green" | "gold" | "red" }) {
  const color = { green: "bg-brand-600", gold: "bg-gold-500", red: "bg-red-500" }[tone];
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-stone-100", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, icon, tone = "green", href }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "green" | "gold" | "red" | "blue"; href?: string }) {
  const t = useT();
  const bg = { green: "bg-brand-50 text-brand-700", gold: "bg-gold-100 text-gold-700", red: "bg-red-50 text-red-600", blue: "bg-sky-50 text-sky-700" }[tone];
  void href;
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(20,40,30,0.04)] sm:gap-3 sm:p-4">
      {icon && <div className={cn("hidden size-10 shrink-0 items-center justify-center rounded-xl min-[400px]:flex", bg)}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-sm leading-tight text-stone-500">{t(label)}</p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900 tabular sm:text-2xl">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
      </div>
    </div>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "warn" | "danger" | "success"; children: ReactNode; className?: string }) {
  const c = { info: "bg-sky-50 text-sky-900 border-sky-200", warn: "bg-amber-50 text-amber-900 border-amber-200", danger: "bg-red-50 text-red-800 border-red-200", success: "bg-brand-50 text-brand-900 border-brand-200" }[tone];
  return <div role="status" className={cn("rounded-lg border px-3 py-2.5 text-sm", c, className)}>{children}</div>;
}

/** Keeps numbers, phone numbers and IDs left-to-right (readable) inside Urdu text. */
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return <span dir="ltr" className={cn("ltr-text tabular", className)}>{children}</span>;
}
