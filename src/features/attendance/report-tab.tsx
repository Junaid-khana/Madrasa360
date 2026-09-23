"use client";
import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet, PrintTable, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, Ltr, Stat } from "@/components/ui/misc";
import { StudentPicker } from "@/components/ui/student-picker";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classLabel, getClass } from "@/lib/services/students";
import type { AttendanceMark, Gender, Student } from "@/lib/types";
import { cn, daysInMonth, downloadFile, monthOf, parseISO, pct, todayISO, toCSV } from "@/lib/utils";
import { LETTER_CLASS, MarkLetter, dayMark } from "./shared";

interface Row { student: Student; cells: (AttendanceMark | null)[]; p: number; a: number; l: number; percent: number }

export function ReportTab() {
  const { t, fmtMonth, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const print = usePrint();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const [classId, setClassId] = useState("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [studentId, setStudentId] = useState("");
  const days = daysInMonth(month);

  const candidates = useMemo(
    () => scoped.students.filter((s) => (!classId || s.classId === classId) && (!gender || s.gender === gender)),
    [scoped.students, classId, gender],
  );

  const { rows, totals } = useMemo(() => {
    const byStudent = new Map<string, AttendanceMark[][]>();
    for (const sh of scoped.attendance) {
      if (monthOf(sh.date) !== month || (classId && sh.classId !== classId)) continue;
      const d = Number(sh.date.slice(8, 10)) - 1;
      for (const [sid, m] of Object.entries(sh.entries)) {
        const arr = byStudent.get(sid) ?? Array.from({ length: days }, () => [] as AttendanceMark[]);
        arr[d].push(m);
        byStudent.set(sid, arr);
      }
    }
    const rows: Row[] = candidates
      .filter((s) => (!studentId || s.id === studentId) && (s.status === "Active" || byStudent.has(s.id)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((student) => {
        const cells = (byStudent.get(student.id) ?? Array.from({ length: days }, () => [] as AttendanceMark[])).map(dayMark);
        const p = cells.filter((c) => c === "P").length, a = cells.filter((c) => c === "A").length, l = cells.filter((c) => c === "L").length;
        return { student, cells, p, a, l, percent: pct(p, p + a + l) };
      });
    const p = rows.reduce((x, r) => x + r.p, 0), a = rows.reduce((x, r) => x + r.a, 0), l = rows.reduce((x, r) => x + r.l, 0);
    return { rows, totals: { p, a, l, percent: pct(p, p + a + l) } };
  }, [scoped.attendance, candidates, month, classId, studentId, days]);

  const dayNums = Array.from({ length: days }, (_, i) => i + 1);
  const isFriday = (d: number) => parseISO(`${month}-${String(d).padStart(2, "0")}`).getDay() === 5;
  const subtitle = [fmtMonth(month), classId ? classLabel(getClass(scoped, classId)) : t("All classes"), gender ? t(gender) : ""].filter(Boolean).join(" · ");

  const exportCsv = () => downloadFile(
    `attendance-${month}.csv`,
    toCSV(["Student ID", "Name", "Class", ...dayNums.map(String), "Present", "Absent", "Leave", "%"],
      rows.map((r) => [r.student.id, r.student.fullName, classLabel(getClass(scoped, r.student.classId)), ...r.cells.map((c) => c ?? ""), r.p, r.a, r.l, r.percent])),
  );
  const doPrint = () => print(
    <PrintSheet title="Monthly Attendance Report" subtitle={subtitle} className="max-w-none">
      <style>{"@media print { @page { size: A4 landscape; margin: 8mm; } }"}</style>
      <PrintTable
        className="text-[9px]"
        headers={["Student", ...dayNums.map(String), "P", "A", "L", "%"]}
        rows={rows.map((r) => [
          <span key="n" className="whitespace-nowrap">{r.student.fullName}</span>,
          ...r.cells.map((c, i) => <span key={i} className={cn("block text-center", c && LETTER_CLASS[c])}>{c ?? "–"}</span>),
          r.p, r.a, r.l, `${r.percent}%`,
        ])}
      />
    </PrintSheet>,
  );

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
        <Field label={t("Month")}><Input type="month" value={month} max={monthOf(today)} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        <Field label={t("Class")}>
          <Select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }}>
            <option value="">{t("All classes")}</option>
            {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
          </Select>
        </Field>
        <Field label={t("Gender")}>
          <Select value={gender} onChange={(e) => { setGender(e.target.value as "" | Gender); setStudentId(""); }}>
            <option value="">{t("All")}</option><option value="Male">{t("Male")}</option><option value="Female">{t("Female")}</option>
          </Select>
        </Field>
        <Field label={t("Student")} hint={t("Optional")}><StudentPicker value={studentId} onChange={setStudentId} students={candidates} placeholder="All students" /></Field>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Present" value={fmtNum(totals.p)} tone="green" />
        <Stat label="Absent" value={fmtNum(totals.a)} tone="red" />
        <Stat label="Leave" value={fmtNum(totals.l)} tone="blue" />
        <Stat label="Attendance %" value={`${fmtNum(totals.percent)}%`} tone="gold" />
      </div>

      <Card className="overflow-hidden">
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 p-3 sm:p-4">
          <p className="text-sm font-medium text-stone-800">{subtitle}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" />{t("Export CSV")}</Button>
            <Button variant="secondary" size="sm" onClick={doPrint} disabled={!rows.length}><Printer className="size-4" />{t("Print")}</Button>
          </div>
        </div>
        {rows.length === 0 ? <EmptyState title="No students match these filters" description="Try changing or clearing the filters." /> : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-500">
                  <th className="sticky start-0 z-10 min-w-40 bg-stone-50 px-3 py-2 text-start font-semibold">{t("Student")}</th>
                  {dayNums.map((d) => <th key={d} className={cn("w-7 min-w-7 px-0.5 py-2 text-center font-medium tabular", isFriday(d) && "bg-stone-100")}>{d}</th>)}
                  {["P", "A", "L", "%"].map((h) => <th key={h} className="min-w-9 px-1.5 py-2 text-center font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r) => (
                  <tr key={r.student.id} className="hover:bg-stone-50/70">
                    <td className="sticky start-0 z-10 bg-white px-3 py-1.5">
                      <span className="block max-w-40 truncate font-medium text-stone-800">{r.student.fullName}</span>
                      <Ltr className="text-[10px] text-stone-400">{r.student.id}</Ltr>
                    </td>
                    {r.cells.map((c, i) => <td key={i} className={cn("px-0.5 py-1.5 text-center", isFriday(i + 1) && "bg-stone-50")}><MarkLetter mark={c} /></td>)}
                    <td className="px-1.5 text-center tabular text-brand-700">{r.p}</td>
                    <td className="px-1.5 text-center tabular text-red-600">{r.a}</td>
                    <td className="px-1.5 text-center tabular text-sky-600">{r.l}</td>
                    <td className={cn("px-1.5 text-center font-semibold tabular", r.percent >= 90 ? "text-brand-700" : r.percent >= 75 ? "text-amber-600" : "text-red-600")}>{fmtNum(r.percent)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
