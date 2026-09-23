"use client";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AttendanceMark } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Selection { date: string; classId: string; session: "Morning" | "Afternoon" | "Evening" }

export const MARK_LABEL: Record<AttendanceMark, string> = { P: "Present", A: "Absent", L: "Leave" };
const ON: Record<AttendanceMark, string> = {
  P: "border-brand-700 bg-brand-700 text-white",
  A: "border-red-600 bg-red-600 text-white",
  L: "border-sky-600 bg-sky-600 text-white",
};
export const LETTER_CLASS: Record<AttendanceMark, string> = { P: "text-brand-700", A: "font-bold text-red-600", L: "font-semibold text-sky-600" };

/** Combine several sessions of one day into one mark: any absence wins, then leave. */
export function dayMark(marks: AttendanceMark[]): AttendanceMark | null {
  if (!marks.length) return null;
  return marks.includes("A") ? "A" : marks.includes("L") ? "L" : "P";
}

/** Large Present / Absent / Leave buttons (min 48px tall) for one student. */
export function MarkButtons({ value, onChange, disabled }: { value?: AttendanceMark; onChange: (m: AttendanceMark) => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <div role="group" className="grid grid-cols-3 gap-2">
      {(["P", "A", "L"] as const).map((m) => (
        <button
          key={m} type="button" disabled={disabled} aria-pressed={value === m} onClick={() => onChange(m)}
          className={cn("flex h-12 items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60",
            value === m ? ON[m] : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50")}
        >
          {value === m && <Check className="size-4" />}{t(MARK_LABEL[m])}
        </button>
      ))}
    </div>
  );
}

/** Small coloured status letter used in tables: P / A / L / –. */
export function MarkLetter({ mark }: { mark: AttendanceMark | null }) {
  return <span className={mark ? LETTER_CLASS[mark] : "text-stone-300"}>{mark ?? "–"}</span>;
}
