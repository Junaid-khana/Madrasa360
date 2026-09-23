"use client";
import { EmptyState } from "@/components/ui/misc";
import { WEEK_DAYS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { TimetableSlot } from "@/lib/types";

/** Weekly timetable: one row per day, one column per time slot. */
export function TimetableGrid({ slots }: { slots: TimetableSlot[] }) {
  const { t } = useI18n();
  if (!slots.length) return <EmptyState title="No timetable yet" description="Edit the class to add weekly lessons." className="py-8" />;
  const times = Array.from(new Set(slots.map((s) => s.time))).sort();
  const days = [...WEEK_DAYS.filter((d) => slots.some((s) => s.day === d)), ...Array.from(new Set(slots.map((s) => s.day))).filter((d) => !WEEK_DAYS.includes(d))];
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="bg-stone-50 text-xs text-stone-500">
            <th className="px-3 py-2 text-start font-semibold">{t("Day")}</th>
            {times.map((tm) => <th key={tm} className="whitespace-nowrap px-3 py-2 text-start font-semibold"><span dir="ltr" className="ltr-text">{tm}</span></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {days.map((d) => (
            <tr key={d}>
              <td className="whitespace-nowrap px-3 py-2 font-medium text-stone-800">{t(d)}</td>
              {times.map((tm) => <td key={tm} className="px-3 py-2 text-stone-700">{slots.find((s) => s.day === d && s.time === tm)?.subject || <span className="text-stone-300">—</span>}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
