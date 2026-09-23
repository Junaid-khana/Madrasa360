"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { CHART, CHART_MARGIN } from "@/components/charts/theme";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Stat } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { studentAttendance } from "@/lib/services/attendance";
import { classLabel, getClass } from "@/lib/services/students";
import type { AttendanceMark } from "@/lib/types";
import { addDays, addMonths, cn, monthOf, todayISO } from "@/lib/utils";
import { dayMark } from "./shared";

const CELL: Record<AttendanceMark, string> = { P: "bg-brand-100 text-brand-800", A: "bg-red-100 text-red-700", L: "bg-sky-100 text-sky-700" };

/** Attendance tab of the student profile: totals, last 30 days, monthly trend and recent absences. */
export function StudentAttendancePanel({ studentId }: { studentId: string }) {
  const { t, fmtNum, fmtDate, fmtMonth } = useI18n();
  const { scoped } = useAuth();
  const today = todayISO();

  const data = useMemo(() => {
    const byDate = new Map<string, AttendanceMark[]>();
    const absences: { date: string; classId: string; session: string }[] = [];
    for (const sh of scoped.attendance) {
      const m = sh.entries[studentId];
      if (!m) continue;
      byDate.set(sh.date, [...(byDate.get(sh.date) ?? []), m]);
      if (m === "A") absences.push({ date: sh.date, classId: sh.classId, session: sh.session });
    }
    absences.sort((a, b) => b.date.localeCompare(a.date));
    const strip = Array.from({ length: 30 }, (_, i) => { const d = addDays(today, i - 29); return { date: d, mark: dayMark(byDate.get(d) ?? []) }; });
    const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(today), i - 5)).map((m) => {
      const c = studentAttendance(scoped, studentId, { from: `${m}-01`, to: `${m}-31` });
      return { month: m, label: fmtMonth(m).split(" ")[0], percent: c.percent, total: c.total };
    });
    return { strip, months, absences: absences.slice(0, 8) };
  }, [scoped, studentId, today, fmtMonth]);

  const c = studentAttendance(scoped, studentId);
  if (c.total === 0) return <Card><EmptyState title="No attendance recorded yet" description="Attendance will appear here once the teacher marks it." /></Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Attendance %" value={`${fmtNum(c.percent)}%`} tone={c.percent >= 85 ? "green" : "red"} sub={t("{n} days recorded", { n: fmtNum(c.total) })} />
        <Stat label="Present" value={fmtNum(c.present)} tone="green" />
        <Stat label="Absent" value={fmtNum(c.absent)} tone="red" />
        <Stat label="Leave" value={fmtNum(c.leave)} tone="blue" />
      </div>

      <Card>
        <CardHeader title={t("Last 30 days")} />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {data.strip.map((d) => (
              <span key={d.date} title={`${fmtDate(d.date)} — ${d.mark ? t(d.mark === "P" ? "Present" : d.mark === "A" ? "Absent" : "Leave") : t("No record")}`}
                className={cn("flex size-8 items-center justify-center rounded-md text-[11px] font-medium tabular", d.mark ? CELL[d.mark] : "bg-stone-50 text-stone-300")}>
                {Number(d.date.slice(8))}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-brand-100" />{t("Present")}</span>
            <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-red-100" />{t("Absent")}</span>
            <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-sky-100" />{t("Leave")}</span>
            <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-stone-100" />{t("No record")}</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly attendance %" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.months} margin={CHART_MARGIN}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, t("Attendance %")]} cursor={{ fill: "#f5f5f4" }} />
              <Bar dataKey="percent" fill={CHART.green} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card>
          <CardHeader title={t("Recent absences")} />
          <CardBody>
            {data.absences.length === 0 ? <p className="text-sm text-stone-500">{t("No absences recorded.")}</p> : (
              <ul className="divide-y divide-stone-100">
                {data.absences.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium text-stone-800">{fmtDate(a.date)}</span>
                    <span className="text-stone-500">{classLabel(getClass(scoped, a.classId))} · {t(a.session)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
