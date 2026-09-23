"use client";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classLabel, getClass } from "@/lib/services/students";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, Ltr } from "./misc";

/** Searchable student selector (name, ID, guardian, phone). Uses the user's scoped data only. */
export function StudentPicker({ value, onChange, students, error, placeholder, autoFocus, className }: {
  value: string;
  onChange: (id: string) => void;
  /** Restrict choices (e.g. Hifz students only). Defaults to all active students the user can see. */
  students?: Student[];
  error?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const { scoped } = useAuth();
  const list = students ?? scoped.students.filter((s) => s.status === "Active");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const selected = list.find((s) => s.id === value) ?? scoped.students.find((s) => s.id === value);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    const src = n ? list.filter((s) => `${s.fullName} ${s.id} ${s.fatherName} ${s.guardian.phone}`.toLowerCase().includes(n)) : list;
    return src.slice(0, 30);
  }, [q, list]);

  if (selected && !open) {
    return (
      <div className={cn("flex h-11 items-center gap-2 rounded-lg border bg-white px-2 sm:h-10", error ? "border-red-400" : "border-stone-300", className)}>
        <Avatar name={selected.fullName} src={selected.photo} size="sm" className="size-7 text-xs" />
        <div className="min-w-0 flex-1 truncate text-sm"><span className="font-medium">{selected.fullName}</span> <Ltr className="text-xs text-stone-500">{selected.id}</Ltr></div>
        <button type="button" aria-label={t("Reset")} onClick={() => { onChange(""); setQ(""); setOpen(true); }} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="size-4" /></button>
      </div>
    );
  }
  return (
    <div ref={box} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
      <input
        autoFocus={autoFocus} value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder={t(placeholder ?? "Search student by name or ID…")} aria-label={t("Student")}
        className={cn("h-11 w-full rounded-lg border bg-white ps-9 pe-3 text-base placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 sm:h-10 sm:text-sm", error ? "border-red-400" : "border-stone-300")}
      />
      {open && (
        <ul className="scroll-thin absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-3 text-sm text-stone-500">{t("No results found")}</li>}
          {matches.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => { onChange(s.id); setOpen(false); setQ(""); }} className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-brand-50">
                <Avatar name={s.fullName} src={s.photo} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-900">{s.fullName}</span>
                  <span className="block truncate text-xs text-stone-500"><Ltr>{s.id}</Ltr> · {classLabel(getClass(scoped, s.classId))} · {s.fatherName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
