"use client";
import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet, PrintTable, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormGrid, Select } from "@/components/ui/form";
import { EmptyState, Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classTotals, examNames } from "@/lib/services/exams";
import { classLabel, getClass } from "@/lib/services/students";
import type { Db, ExamResult } from "@/lib/types";
import { cn, downloadFile, toCSV } from "@/lib/utils";
import { ExamSelect, GradeBadge, PassBadge, isPass } from "./shared";

export function buildClassReport(db: Db, classId: string, exam: string) {
  const cls = getClass(db, classId);
  const totals = classTotals(db, classId, exam);
  const present = new Set(totals.flatMap((t) => t.rows.map((r) => r.subject)));
  const order = cls?.subjects ?? [];
  const subjects = [...order.filter((s) => present.has(s)), ...[...present].filter((s) => !order.includes(s)).sort()];
  const rows = totals.map((t, i) => {
    const by = new Map<string, ExamResult>(t.rows.map((r) => [r.subject, r]));
    return { rank: i + 1, student: db.students.find((s) => s.id === t.studentId), cells: subjects.map((s) => by.get(s)), ...t };
  });
  return { cls, subjects, rows };
}

function ClassReportSheet({ classId, exam }: { classId: string; exam: string }) {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const rep = buildClassReport(scoped, classId, exam);
  return (
    <PrintSheet title="Class Result Report" subtitle={`${exam} · ${classLabel(rep.cls)}`}>
      <PrintTable className="text-[10px]"
        headers={["Rank", "Student", ...rep.subjects, "Total", "Percentage", "Grade", "Result"]}
        rows={rep.rows.map((r) => [r.rank, `${r.student?.fullName ?? r.studentId} (${r.studentId})`, ...r.cells.map((c) => (c ? fmtNum(c.marks) : "—")), `${fmtNum(r.marks)}/${fmtNum(r.total)}`, `${fmtNum(r.percentage)}%`, r.grade, t(isPass(r.percentage) ? "Pass" : "Fail")])} />
      <p className="mt-2 text-[11px]">{t("Students")}: {rep.rows.length}</p>
    </PrintSheet>
  );
}

export function ClassReportTab() {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const print = usePrint();
  const exams = useMemo(() => examNames(scoped), [scoped]);
  const [exam, setExam] = useState(exams[0] ?? "");
  const [classId, setClassId] = useState(scoped.classes[0]?.id ?? "");
  const rep = useMemo(() => buildClassReport(scoped, classId, exam), [scoped, classId, exam]);

  const csv = () => downloadFile(`class-result-${exam}-${classLabel(rep.cls)}.csv`.replace(/\s+/g, "-"), toCSV(
    ["Rank", "Student ID", "Student", ...rep.subjects, "Total", "Total Marks", "Percentage", "Grade", "Result"],
    rep.rows.map((r) => [r.rank, r.studentId, r.student?.fullName, ...r.cells.map((c) => c?.marks ?? ""), r.marks, r.total, r.percentage, r.grade, isPass(r.percentage) ? "Pass" : "Fail"])));

  return (
    <div className="space-y-4">
      <Card><CardBody>
        <FormGrid>
          <Field label={t("Exam")}><ExamSelect value={exam} onChange={setExam} exams={exams} /></Field>
          <Field label={t("Class")}><Select value={classId} onChange={(e) => setClassId(e.target.value)}>{scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}</Select></Field>
        </FormGrid>
      </CardBody></Card>
      <Card className="overflow-hidden">
        {rep.rows.length === 0 ? <EmptyState title="No results for this class" description="Enter marks for this exam and class first." /> : (
          <>
            <div className="no-print flex flex-wrap justify-end gap-2 border-b border-stone-100 p-3">
              <Button variant="secondary" size="sm" onClick={csv}><Download className="size-4" />{t("Export CSV")}</Button>
              <Button size="sm" onClick={() => print(<ClassReportSheet classId={classId} exam={exam} />)}><Printer className="size-4" />{t("Print result sheet")}</Button>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{t("Rank")}</th><th className="px-3 py-2.5 text-start">{t("Student")}</th>
                    {rep.subjects.map((s) => <th key={s} className="whitespace-nowrap px-3 py-2.5 text-end">{s}</th>)}
                    <th className="px-3 py-2.5 text-end">{t("Total")}</th><th className="px-3 py-2.5 text-end">%</th><th className="px-3 py-2.5 text-center">{t("Grade")}</th><th className="px-3 py-2.5 text-center">{t("Result")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rep.rows.map((r) => (
                    <tr key={r.studentId} className={cn(!isPass(r.percentage) && "bg-red-50/50")}>
                      <td className="tabular px-3 py-2.5 font-semibold">{r.rank}</td>
                      <td className="whitespace-nowrap px-3 py-2.5"><p className="font-medium text-stone-900">{r.student?.fullName}</p><p className="text-xs text-stone-500"><Ltr>{r.studentId}</Ltr></p></td>
                      {r.cells.map((c, i) => <td key={i} className={cn("tabular px-3 py-2.5 text-end", c && !isPass(c.percentage) && "font-semibold text-red-600")}>{c ? fmtNum(c.marks) : "—"}</td>)}
                      <td className="tabular whitespace-nowrap px-3 py-2.5 text-end">{fmtNum(r.marks)} / {fmtNum(r.total)}</td>
                      <td className="tabular px-3 py-2.5 text-end font-medium">{fmtNum(r.percentage)}%</td>
                      <td className="px-3 py-2.5 text-center"><GradeBadge grade={r.grade} /></td>
                      <td className="px-3 py-2.5 text-center"><PassBadge percentage={r.percentage} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
