"use client";
import { Badge, type Tone } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { useT } from "@/lib/i18n";
import { PASS_PERCENT } from "@/lib/constants";

const GRADE_TONE: Record<string, Tone> = { "A+": "green", A: "green", B: "gold", C: "gold", D: "amber", E: "amber", F: "red" };
export const GradeBadge = ({ grade }: { grade: string }) => <Badge tone={GRADE_TONE[grade] ?? "gray"}>{grade}</Badge>;

export const isPass = (percentage: number) => percentage >= PASS_PERCENT;

export function PassBadge({ percentage }: { percentage: number }) {
  const t = useT();
  return <Badge tone={isPass(percentage) ? "green" : "red"}>{t(isPass(percentage) ? "Pass" : "Fail")}</Badge>;
}

export function ExamSelect({ value, onChange, exams, className }: { value: string; onChange: (v: string) => void; exams: string[]; className?: string }) {
  const t = useT();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label={t("Exam")}>
      {exams.length === 0 && <option value="">{t("No exams yet")}</option>}
      {exams.map((x) => <option key={x} value={x}>{x}</option>)}
    </Select>
  );
}
