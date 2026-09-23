import type { Db } from "@/lib/types";
import { addDays, addMonths, daysInMonth, monthOf, pct, sum, todayISO } from "@/lib/utils";
import { dayAttendance } from "@/lib/services/attendance";
import { buildLedger, financeStats } from "@/lib/services/fees";
import { hifzStats } from "@/lib/services/hifz";
import { classLabel } from "@/lib/services/students";

/** Everything the dashboard shows, derived from a (scoped) database snapshot. */
export function computeDashboard(db: Db, today = todayISO()) {
  const active = db.students.filter((s) => s.status === "Active");
  const male = active.filter((s) => s.gender === "Male").length;
  const day = dayAttendance(db, today);

  const perClass = db.classes.map((c) => ({
    id: c.id,
    name: classLabel(c),
    Male: active.filter((s) => s.classId === c.id && s.gender === "Male").length,
    Female: active.filter((s) => s.classId === c.id && s.gender === "Female").length,
  }));

  const trend = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).flatMap((date) => {
    const sheets = db.attendance.filter((a) => a.date === date);
    if (!sheets.length) return [];
    let p = 0, total = 0;
    for (const sh of sheets) for (const m of Object.values(sh.entries)) { total++; if (m === "P") p++; }
    return [{ date, percent: pct(p, total) }];
  });

  const ledger = buildLedger(db);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(today), i - 5));
  const feeMonths = months.map((m) => ({
    month: m,
    Collected: sum(db.payments.filter((p) => monthOf(p.date) === m).map((p) => p.amount)),
    Billed: sum(ledger.filter((r) => r.record.month === m).map((r) => r.net)),
  }));

  const enrollMonths = Array.from({ length: 12 }, (_, i) => addMonths(monthOf(today), i - 11));
  const enrollment = enrollMonths.map((m) => {
    const end = `${m}-${String(daysInMonth(m)).padStart(2, "0")}`;
    return { month: m, students: db.students.filter((s) => s.admissionDate <= end && s.status !== "Left").length };
  });

  return {
    active: active.length, male, female: active.length - male,
    teachers: db.teachers.filter((t) => t.status === "Active").length,
    classes: db.classes.length,
    day, perClass, trend, feeMonths, enrollment,
    finance: financeStats(db, today),
    hifz: hifzStats(db, today),
  };
}
export type DashboardData = ReturnType<typeof computeDashboard>;
