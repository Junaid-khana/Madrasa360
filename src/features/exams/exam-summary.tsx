"use client";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { CHART } from "@/components/charts/theme";
import { PrintSheet, PrintTable, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/form";
import { EmptyState, Stat } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { examNames, examSummary } from "@/lib/services/exams";
import { classLabel, getClass, getStudent } from "@/lib/services/students";
import { sum } from "@/lib/utils";
import { ExamSelect } from "./shared";

function useSummary(exam: string) {
  const { scoped } = useAuth();
  return useMemo(() => {
    const s = examSummary(scoped, exam);
    return { ...s, perClass: s.perClass.map((c) => ({ ...c, label: classLabel(getClass(scoped, c.classId)), top: getStudent(scoped, c.topStudentId ?? "")?.fullName ?? "—" })) };
  }, [scoped, exam]);
}

function SummarySheet({ exam }: { exam: string }) {
  const { t, fmtNum } = useI18n();
  const s = useSummary(exam);
  return (
    <PrintSheet title="Exam Summary" subtitle={exam}>
      <h3 className="mb-1 font-semibold">{t("Class performance")}</h3>
      <PrintTable headers={["Class", "Students", "Average %", "Pass rate", "Top student"]}
        rows={s.perClass.map((c) => [c.label, fmtNum(c.students), `${fmtNum(c.average)}%`, `${fmtNum(c.passRate)}%`, `${c.top} (${fmtNum(c.topPercentage)}%)`])} />
      <h3 className="mb-1 mt-4 font-semibold">{t("Subject averages")}</h3>
      <PrintTable headers={["Subject", "Entries", "Average %"]} rows={s.subjects.map((x) => [x.subject, fmtNum(x.entries), `${fmtNum(x.average)}%`])} />
      <h3 className="mb-1 mt-4 font-semibold">{t("Grade distribution")}</h3>
      <PrintTable headers={s.grades.map((g) => g.grade)} rows={[s.grades.map((g) => fmtNum(g.count))]} />
    </PrintSheet>
  );
}

export function ExamSummaryTab() {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const print = usePrint();
  const exams = useMemo(() => examNames(scoped), [scoped]);
  const [exam, setExam] = useState(exams[0] ?? "");
  const s = useSummary(exam);
  const students = sum(s.perClass.map((c) => c.students));
  const overall = s.perClass.length && students ? Math.round(sum(s.perClass.map((c) => c.average * c.students)) / students * 10) / 10 : 0;
  const passed = students ? Math.round(sum(s.perClass.map((c) => c.passRate * c.students)) / students) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label={t("Exam")} className="w-full sm:w-72"><ExamSelect value={exam} onChange={setExam} exams={exams} /></Field>
        {s.entries > 0 && <Button onClick={() => print(<SummarySheet exam={exam} />)}><Printer className="size-4" />{t("Print summary")}</Button>}
      </div>
      {s.entries === 0 ? <Card><EmptyState title="No results for this exam" description="Enter marks for this exam first." /></Card> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Students examined" value={fmtNum(students)} />
            <Stat label="Classes" value={fmtNum(s.perClass.length)} tone="blue" />
            <Stat label="Overall average" value={`${fmtNum(overall)}%`} tone="gold" />
            <Stat label="Pass rate" value={`${fmtNum(passed)}%`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader title={t("Class performance")} className="pb-3" />
              <div className="scroll-thin overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr>
                  <th className="px-3 py-2 text-start">{t("Class")}</th><th className="px-3 py-2 text-end">{t("Average")}</th><th className="px-3 py-2 text-end">{t("Pass rate")}</th><th className="px-3 py-2 text-start">{t("Top student")}</th>
                </tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {s.perClass.map((c) => (
                    <tr key={c.classId}>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium">{c.label}</td>
                      <td className="tabular px-3 py-2.5 text-end">{fmtNum(c.average)}%</td>
                      <td className="tabular px-3 py-2.5 text-end">{fmtNum(c.passRate)}%</td>
                      <td className="px-3 py-2.5">{c.top} <span className="tabular text-xs text-stone-500">({fmtNum(c.topPercentage)}%)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Card>
            <ChartCard title="Grade distribution" description="Number of subject results per grade" height={240}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.grades} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="grade" tick={{ fontSize: 12, fill: CHART.axis }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART.axis }} />
                  <Tooltip formatter={(v) => [v as number, t("Results")]} cursor={{ fill: "#f5f5f4" }} />
                  <Bar dataKey="count" fill={CHART.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <Card>
            <CardHeader title={t("Subject averages")} />
            <CardBody className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {s.subjects.map((x) => (
                <div key={x.subject} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm"><span>{x.subject}</span><span className="tabular font-medium">{fmtNum(x.average)}%</span></div>
              ))}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
