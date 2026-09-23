"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/feedback";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { EmptyState, Ltr } from "@/components/ui/misc";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classRoster } from "@/lib/services/attendance";
import { examOptions, saveResults } from "@/lib/services/exams";
import { classLabel, getClass } from "@/lib/services/students";
import { gradeFor, pct, sum } from "@/lib/utils";
import { ExamSelect, GradeBadge } from "./shared";

/** Marks entry for one exam + class + subject. Existing marks are pre-filled so this also edits. */
export function EnterResults() {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const exams = useMemo(() => examOptions(scoped), [scoped]);
  const [exam, setExam] = useState(exams[0] ?? "");
  const [classId, setClassId] = useState(scoped.classes[0]?.id ?? "");
  const cls = getClass(scoped, classId);
  const subjects = cls?.subjects.length ? cls.subjects : scoped.settings.subjects;
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [total, setTotal] = useState("100");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const roster = useMemo(() => classRoster(scoped, classId), [scoped, classId]);
  const totalN = Number(total);

  useEffect(() => {
    const ex = scoped.results.filter((r) => r.exam === exam && r.classId === classId && r.subject === subject);
    setMarks(Object.fromEntries(ex.map((r) => [r.studentId, String(r.marks)])));
    setRemarks(Object.fromEntries(ex.map((r) => [r.studentId, r.remarks])));
    if (ex[0]) setTotal(String(ex[0].totalMarks));
    // Re-load only when the selection changes, never while the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, classId, subject]);

  const onClass = (id: string) => {
    setClassId(id);
    const c = getClass(scoped, id);
    setSubject((c?.subjects.length ? c.subjects : scoped.settings.subjects)[0] ?? "");
  };

  const invalid = (v: string | undefined) => v !== undefined && v.trim() !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > totalN);
  const entered = roster.filter((s) => (marks[s.id] ?? "").trim() !== "");
  const avg = entered.length && totalN > 0 ? Math.round(sum(entered.map((s) => pct(Number(marks[s.id]), totalN))) / entered.length * 10) / 10 : 0;

  const save = () => {
    if (!exam || !subject || !classId) { toast.error(t("Select the exam, class and subject")); return; }
    if (!(totalN > 0)) { toast.error(t("Enter the total marks")); return; }
    if (entered.some((s) => invalid(marks[s.id]))) { toast.error(t("Marks must be between 0 and {total}", { total: totalN })); return; }
    if (!entered.length) { toast.error(t("Enter marks for at least one student")); return; }
    try {
      saveResults({ exam, classId, subject, totalMarks: totalN, rows: entered.map((s) => ({ studentId: s.id, marks: Number(marks[s.id]), remarks: remarks[s.id] ?? "" })) }, actor);
      toast.success(t("Results saved for {n} students", { n: entered.length }));
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    }
  };

  return (
    <div className="space-y-4">
      <Card><CardBody>
        <FormGrid cols={3} className="lg:grid-cols-4">
          <Field label={t("Exam")}><ExamSelect value={exam} onChange={setExam} exams={exams} /></Field>
          <Field label={t("Class")}>
            <Select value={classId} onChange={(e) => onClass(e.target.value)}>{scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}</Select>
          </Field>
          <Field label={t("Subject")}>
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </Field>
          <Field label={t("Total marks")}><Input type="number" inputMode="numeric" min={1} value={total} onChange={(e) => setTotal(e.target.value)} /></Field>
        </FormGrid>
      </CardBody></Card>

      <Card className="overflow-hidden">
        {roster.length === 0 ? <EmptyState title="No students in this class" description="Assign students to the class first." /> : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_5rem_4rem_minmax(0,14rem)] gap-3 bg-stone-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500 sm:grid">
              <span>{t("Student")}</span><span>{t("Marks")}</span><span>{t("Percentage")}</span><span>{t("Grade")}</span><span>{t("Remarks")}</span>
            </div>
            <ul className="divide-y divide-stone-100">
              {roster.map((s) => {
                const v = marks[s.id] ?? "";
                const bad = invalid(v);
                const has = v.trim() !== "" && !bad && totalN > 0;
                const p = has ? pct(Number(v), totalN) : null;
                return (
                  <li key={s.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_5rem_4rem_minmax(0,14rem)] sm:items-center sm:gap-3">
                    <div className="min-w-0"><p className="truncate font-medium text-stone-900">{s.fullName}</p><p className="text-xs text-stone-500"><Ltr>{s.id}</Ltr></p></div>
                    <div className="flex items-center gap-3 sm:contents">
                      <Input type="number" inputMode="decimal" min={0} max={totalN} value={v} error={bad} aria-label={`${t("Marks")} — ${s.fullName}`} placeholder={`/ ${total}`}
                        onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))} className="w-28 sm:w-full" />
                      <span className="tabular text-sm text-stone-600">{p !== null ? `${fmtNum(p)}%` : "—"}</span>
                      <span>{p !== null ? <GradeBadge grade={gradeFor(p)} /> : <span className="text-stone-400">—</span>}</span>
                    </div>
                    <Input value={remarks[s.id] ?? ""} placeholder={t("Remarks")} aria-label={t("Remarks")} onChange={(e) => setRemarks((m) => ({ ...m, [s.id]: e.target.value }))} />
                    {bad && <p className="text-xs font-medium text-red-600 sm:col-span-5">{t("Marks must be between 0 and {total}", { total: totalN })}</p>}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3">
              <p className="text-sm text-stone-600">{t("{a} of {b} students entered", { a: entered.length, b: roster.length })}{entered.length > 0 && ` · ${t("Class average")}: ${fmtNum(avg)}%`}</p>
              <Button size="lg" onClick={save}>{t("Save results")}</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
