"use client";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet, PrintTable, SignatureLine, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormGrid } from "@/components/ui/form";
import { EmptyState, Ltr } from "@/components/ui/misc";
import { StudentPicker } from "@/components/ui/student-picker";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { examNames, resultCard } from "@/lib/services/exams";
import { classLabel, getClass, getTeacher } from "@/lib/services/students";
import { calcAge } from "@/lib/utils";
import { ExamSelect } from "./shared";

/** Printable result card for one student in one exam (also used as the on-screen preview). */
export function ResultCardSheet({ studentId, exam }: { studentId: string; exam: string }) {
  const { t, fmtNum, fmtDate } = useI18n();
  const { scoped } = useAuth();
  const card = resultCard(scoped, studentId, exam);
  if (!card) return null;
  const s = card.student;
  const cls = getClass(scoped, s.classId);
  const teacher = cls ? getTeacher(scoped, cls.teacherId) : undefined;
  const remarks = card.rows.filter((r) => r.remarks).map((r) => `${r.subject}: ${r.remarks}`).join("; ");
  const details: [string, string][] = [
    ["Student", s.fullName], ["Student ID", s.id], ["Father's name", s.fatherName], ["Class", classLabel(cls)],
    ["Gender", t(s.gender)], ["Age", `${calcAge(s.dob)} ${t("years")}`],
  ];
  return (
    <PrintSheet title="Result Card" subtitle={`${exam} · ${fmtDate(card.rows[0].date)}`}>
      <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 border border-stone-300 p-3 text-[12px]">
        {details.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="w-28 shrink-0 font-semibold">{t(k)}:</dt><dd>{k === "Student ID" ? <Ltr>{v}</Ltr> : v}</dd></div>)}
      </dl>
      <PrintTable headers={["Subject", "Marks Obtained", "Total Marks", "Percentage", "Grade"]}
        rows={[
          ...card.rows.map((r) => [r.subject, fmtNum(r.marks), fmtNum(r.totalMarks), `${fmtNum(r.percentage)}%`, r.grade]),
          [<b key="t">{t("Total")}</b>, <b key="m">{fmtNum(card.marks)}</b>, <b key="tt">{fmtNum(card.total)}</b>, <b key="p">{fmtNum(card.percentage)}%</b>, <b key="g">{card.grade}</b>],
        ]} />
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[12px]">
        <div className="border border-stone-300 p-2"><div className="text-[10px] uppercase text-stone-500">{t("Position in class")}</div><div className="text-base font-bold">{card.position} / {card.classSize}</div></div>
        <div className="border border-stone-300 p-2"><div className="text-[10px] uppercase text-stone-500">{t("Overall grade")}</div><div className="text-base font-bold">{card.grade}</div></div>
        <div className="border border-stone-300 p-2"><div className="text-[10px] uppercase text-stone-500">{t("Result")}</div><div className="text-base font-bold">{t(card.passed ? "Pass" : "Fail")}</div></div>
      </div>
      {remarks && <p className="mt-3 text-[12px]"><b>{t("Remarks")}:</b> {remarks}</p>}
      <div className="mt-14 flex justify-between">
        <div><SignatureLine label="Class Teacher" />{teacher && <div className="mt-0.5 w-44 text-center text-[10px] text-stone-500">{teacher.name}</div>}</div>
        <div><SignatureLine label="Principal" />{scoped.settings.principal && <div className="mt-0.5 w-44 text-center text-[10px] text-stone-500">{scoped.settings.principal}</div>}</div>
      </div>
    </PrintSheet>
  );
}

/** "Result Card" tab: pick an exam and a student, preview, print. */
export function ResultCardTab() {
  const { t } = useI18n();
  const { scoped } = useAuth();
  const print = usePrint();
  const exams = useMemo(() => examNames(scoped), [scoped]);
  const [exam, setExam] = useState(exams[0] ?? "");
  const [studentId, setStudentId] = useState("");
  const students = useMemo(() => scoped.students.filter((s) => scoped.results.some((r) => r.studentId === s.id && r.exam === exam)), [scoped, exam]);
  const has = !!studentId && resultCard(scoped, studentId, exam);

  return (
    <div className="space-y-4">
      <Card><CardBody>
        <FormGrid>
          <Field label={t("Exam")}><ExamSelect value={exam} onChange={(v) => { setExam(v); setStudentId(""); }} exams={exams} /></Field>
          <Field label={t("Student")}><StudentPicker value={studentId} onChange={setStudentId} students={students} /></Field>
        </FormGrid>
      </CardBody></Card>
      {has ? (
        <>
          <div className="flex justify-end"><Button onClick={() => print(<ResultCardSheet studentId={studentId} exam={exam} />)}><Printer className="size-4" />{t("Print result card")}</Button></div>
          <Card className="overflow-x-auto p-4 sm:p-8"><ResultCardSheet studentId={studentId} exam={exam} /></Card>
        </>
      ) : <Card><EmptyState title={studentId ? "No results for this exam" : "Select a student"} description="Choose an exam and a student to see the result card." /></Card>}
    </div>
  );
}
