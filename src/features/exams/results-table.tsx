"use client";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { examNames } from "@/lib/services/exams";
import { classLabel, getClass } from "@/lib/services/students";
import type { ExamResult } from "@/lib/types";
import { GradeBadge } from "./shared";

interface Row { r: ExamResult; name: string; cls: string }

export function ResultsTable() {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const [exam, setExam] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");

  const rows = useMemo<Row[]>(() => {
    const names = new Map(scoped.students.map((s) => [s.id, s.fullName]));
    return scoped.results.map((r) => ({ r, name: names.get(r.studentId) ?? r.studentId, cls: classLabel(getClass(scoped, r.classId)) }));
  }, [scoped]);
  const subjects = useMemo(() => Array.from(new Set(scoped.results.map((r) => r.subject))).sort(), [scoped.results]);
  const filtered = rows.filter(({ r }) => (!exam || r.exam === exam) && (!classId || r.classId === classId) && (!subject || r.subject === subject) && (!grade || r.grade === grade));

  const columns: Column<Row>[] = [
    { key: "s", header: "Student", sort: (x) => x.name, text: (x) => x.name, cell: (x) => <div><p className="font-medium text-stone-900">{x.name}</p><p className="text-xs text-stone-500"><Ltr>{x.r.studentId}</Ltr></p></div> },
    { key: "c", header: "Class", sort: (x) => x.cls, text: (x) => x.cls, cell: (x) => x.cls, hideBelow: "md" },
    { key: "e", header: "Exam", sort: (x) => x.r.exam, text: (x) => x.r.exam, cell: (x) => x.r.exam, hideBelow: "lg" },
    { key: "sub", header: "Subject", sort: (x) => x.r.subject, text: (x) => x.r.subject, cell: (x) => x.r.subject },
    { key: "m", header: "Marks", sort: (x) => x.r.marks, text: (x) => x.r.marks, cell: (x) => fmtNum(x.r.marks), align: "end" },
    { key: "t", header: "Total", text: (x) => x.r.totalMarks, cell: (x) => fmtNum(x.r.totalMarks), align: "end", hideBelow: "sm" },
    { key: "p", header: "Percentage", sort: (x) => x.r.percentage, text: (x) => `${x.r.percentage}%`, cell: (x) => `${fmtNum(x.r.percentage)}%`, align: "end" },
    { key: "g", header: "Grade", sort: (x) => x.r.grade, text: (x) => x.r.grade, cell: (x) => <GradeBadge grade={x.r.grade} />, align: "center" },
    { key: "rm", header: "Remarks", text: (x) => x.r.remarks, cell: (x) => x.r.remarks || "—", hideBelow: "lg" },
  ];

  return (
    <DataTable columns={columns} rows={filtered} rowKey={(x) => x.r.id} pageSize={10} exportName="exam-results"
      searchText={(x) => `${x.name} ${x.r.studentId} ${x.r.subject}`} searchPlaceholder="Search student, ID or subject…"
      toolbar={<>
        <Select value={exam} onChange={(e) => setExam(e.target.value)} className="w-auto" aria-label={t("Exam")}><option value="">{t("All exams")}</option>{examNames(scoped).map((x) => <option key={x}>{x}</option>)}</Select>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto" aria-label={t("Class")}><option value="">{t("All classes")}</option>{scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}</Select>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-auto" aria-label={t("Subject")}><option value="">{t("All subjects")}</option>{subjects.map((x) => <option key={x}>{x}</option>)}</Select>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-auto" aria-label={t("Grade")}><option value="">{t("All grades")}</option>{["A+", "A", "B", "C", "D", "E", "F"].map((x) => <option key={x}>{x}</option>)}</Select>
      </>} />
  );
}
