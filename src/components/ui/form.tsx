"use client";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-stone-50 disabled:text-stone-500 sm:text-sm";
const border = (err?: boolean) => (err ? "border-red-400" : "border-stone-300");

export function Field({ label, error, hint, required, children, className }: {
  label?: ReactNode; error?: string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-stone-700">
          {label}
          {required && <span className="text-red-600" aria-hidden> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{t(error)}</p>}
    </div>
  );
}

export function Input({ error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className={cn(control, border(error), "h-11 sm:h-10", className)} aria-invalid={error || undefined} {...rest} />;
}

export function Select({ error, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select className={cn(control, border(error), "h-11 pe-8 sm:h-10", className)} aria-invalid={error || undefined} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea className={cn(control, border(error), "min-h-20 py-2", className)} aria-invalid={error || undefined} {...rest} />;
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-stone-700", className)}>
      <input type="checkbox" className="size-4 rounded border-stone-300 accent-brand-700" {...rest} />
      {label}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center justify-between gap-4 py-2", disabled ? "opacity-60" : "cursor-pointer")}>
      <span className="text-sm text-stone-700">{label}</span>
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand-700" : "bg-stone-300")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "start-[1.4rem]" : "start-0.5")} />
      </button>
    </label>
  );
}

/** Responsive grid for form fields. */
export function FormGrid({ cols = 2, className, children }: { cols?: 1 | 2 | 3; className?: string; children: ReactNode }) {
  return <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const t = useT();
  return (
    <section className="border-t border-stone-100 pt-5 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-stone-900">{t(title)}</h3>
      {description && <p className="mb-3 mt-0.5 text-xs text-stone-500">{t(description)}</p>}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}
