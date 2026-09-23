import { store } from "../db/store";
import { PASS_PERCENT } from "../constants";
import type { Db, ExamResult, Student } from "../types";
import { gradeFor, pct, sum, todayISO, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";
import { classLabel, getClass } from "./students";

export const examNames = (db: Db) =>
  Array.from(new Set(db.results.map((r) => r.exam))).sort((a, b) => b.localeCompare(a));

/** Exam names offered when entering marks: configured types × academic year, plus any existing exams. */
export const examOptions = (db: Db) => {
  const configured = db.settings.examTypes.map((t) => `${t} ${db.settings.academicYear}`);
  return Array.from(new Set([...configured, ...examNames(db)]));
};

export function saveResults(
  input: { exam: string; classId: string; subject: string; totalMarks: number; rows: { studentId: string; marks: number; remarks: string }[] },
  actor: Actor,
) {
  store.update((d) => {
    for (const row of input.rows) {
      const percentage = Math.round((row.marks / input.totalMarks) * 1000) / 10;
      const existing = d.results.find((r) => r.studentId === row.studentId && r.exam === input.exam && r.subject === input.subject);
      const base = {
        studentId: row.studentId, classId: input.classId, exam: input.exam, subject: input.subject, marks: row.marks,
        totalMarks: input.totalMarks, percentage, grade: gradeFor(percentage), remarks: row.remarks, enteredBy: actor.id, date: todayISO(),
      };
      if (existing) Object.assign(existing, base); else d.results.push({ id: uid("r"), ...base });
    }
    const cls = getClass(d, input.classId);
    pushActivity(d, actor, "exam", `${input.exam} — ${input.subject} results entered for ${classLabel(cls)} (${input.rows.length} students)`);
  });
}

export interface ResultCard {
  student: Student;
  exam: string;
  rows: ExamResult[];
  marks: number;
  total: number;
  percentage: number;
  grade: string;
  passed: boolean;
  position: number;
  classSize: number;
}

/** Totals for one student in one exam, with position within class. */
export function resultCard(db: Db, studentId: string, exam: string): ResultCard | null {
  const student = db.students.find((s) => s.id === studentId);
  const rows = db.results.filter((r) => r.studentId === studentId && r.exam === exam);
  if (!student || !rows.length) return null;
  const marks = sum(rows.map((r) => r.marks)), total = sum(rows.map((r) => r.totalMarks));
  const percentage = pct(marks, total);
  const classmates = classTotals(db, student.classId, exam);
  const position = classmates.findIndex((c) => c.studentId === studentId) + 1;
  return { student, exam, rows, marks, total, percentage, grade: gradeFor(percentage), passed: percentage >= PASS_PERCENT, position, classSize: classmates.length };
}

export function classTotals(db: Db, classId: string, exam: string) {
  const byStudent = new Map<string, ExamResult[]>();
  for (const r of db.results) if (r.classId === classId && r.exam === exam) (byStudent.get(r.studentId) ?? byStudent.set(r.studentId, []).get(r.studentId)!).push(r);
  return [...byStudent.entries()]
    .map(([studentId, rows]) => {
      const marks = sum(rows.map((r) => r.marks)), total = sum(rows.map((r) => r.totalMarks));
      return { studentId, rows, marks, total, percentage: pct(marks, total), grade: gradeFor(pct(marks, total)) };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

export function examSummary(db: Db, exam: string) {
  const rows = db.results.filter((r) => r.exam === exam);
  const classIds = Array.from(new Set(rows.map((r) => r.classId)));
  const perClass = classIds.map((cid) => {
    const totals = classTotals(db, cid, exam);
    return {
      classId: cid, students: totals.length,
      average: totals.length ? Math.round(sum(totals.map((t) => t.percentage)) / totals.length * 10) / 10 : 0,
      passRate: pct(totals.filter((t) => t.percentage >= PASS_PERCENT).length, totals.length),
      topStudentId: totals[0]?.studentId, topPercentage: totals[0]?.percentage ?? 0,
    };
  });
  const subjects = Array.from(new Set(rows.map((r) => r.subject))).map((subject) => {
    const rs = rows.filter((r) => r.subject === subject);
    return { subject, entries: rs.length, average: Math.round(sum(rs.map((r) => r.percentage)) / rs.length * 10) / 10 };
  });
  const grades = ["A+", "A", "B", "C", "D", "E", "F"].map((g) => ({ grade: g, count: rows.filter((r) => r.grade === g).length }));
  return { perClass, subjects, grades, entries: rows.length };
}
