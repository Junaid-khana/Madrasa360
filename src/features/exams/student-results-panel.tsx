"use client";
import { Printer } from "lucide-react";
import { useMemo } from "react";
import { usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { resultCard } from "@/lib/services/exams";
import { ResultCardSheet } from "./result-card";
import { GradeBadge, PassBadge } from "./shared";

/** Student profile → Academic Results tab. */
export function StudentResultsPanel({ studentId }: { studentId: string }) {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const print = usePrint();
  const exams = useMemo(() => Array.from(new Set(scoped.results.filter((r) => r.studentId === studentId).map((r) => r.exam))).sort().reverse(), [scoped.results, studentId]);
  if (!exams.length) return <Card><EmptyState title="No results yet" description="Exam results will appear here once marks are entered." /></Card>;

  return (
    <div className="space-y-4">
      {exams.map((exam) => {
        const card = resultCard(scoped, studentId, exam);
        if (!card) return null;
        return (
          <Card key={exam} className="overflow-hidden">
            <CardHeader title={exam} className="pb-3"
              description={`${t("Position in class")}: ${card.position} / ${card.classSize}`}
              action={<div className="flex items-center gap-2"><PassBadge percentage={card.percentage} /><Button variant="secondary" size="sm" onClick={() => print(<ResultCardSheet studentId={studentId} exam={exam} />)}><Printer className="size-4" />{t("Result card")}</Button></div>} />
            <div className="scroll-thin overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr>
                <th className="px-4 py-2 text-start">{t("Subject")}</th><th className="px-3 py-2 text-end">{t("Marks")}</th><th className="px-3 py-2 text-end">{t("Total")}</th><th className="px-3 py-2 text-end">%</th><th className="px-3 py-2 text-center">{t("Grade")}</th>
              </tr></thead>
              <tbody className="divide-y divide-stone-100">
                {card.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">{r.subject}</td><td className="tabular px-3 py-2.5 text-end">{fmtNum(r.marks)}</td><td className="tabular px-3 py-2.5 text-end">{fmtNum(r.totalMarks)}</td>
                    <td className="tabular px-3 py-2.5 text-end">{fmtNum(r.percentage)}%</td><td className="px-3 py-2.5 text-center"><GradeBadge grade={r.grade} /></td>
                  </tr>
                ))}
                <tr className="bg-stone-50 font-semibold">
                  <td className="px-4 py-2.5">{t("Total")}</td><td className="tabular px-3 py-2.5 text-end">{fmtNum(card.marks)}</td><td className="tabular px-3 py-2.5 text-end">{fmtNum(card.total)}</td>
                  <td className="tabular px-3 py-2.5 text-end">{fmtNum(card.percentage)}%</td><td className="px-3 py-2.5 text-center"><GradeBadge grade={card.grade} /></td>
                </tr>
              </tbody>
            </table></div>
          </Card>
        );
      })}
    </div>
  );
}
