import { store } from "../db/store";
import type { AttendanceMark, AttendanceSheet, Db, Session, Student } from "../types";
import { nowISO, pct, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";
import { classLabel, getClass } from "./students";

export interface AttendanceCounts { present: number; absent: number; leave: number; total: number; percent: number }

export const emptyCounts = (): AttendanceCounts => ({ present: 0, absent: 0, leave: 0, total: 0, percent: 0 });
export function addMark(c: AttendanceCounts, m: AttendanceMark) {
  if (m === "P") c.present++; else if (m === "A") c.absent++; else c.leave++;
  c.total++;
  c.percent = pct(c.present, c.total);
}

export const findSheet = (db: Db, date: string, classId: string, session: Session) =>
  db.attendance.find((a) => a.date === date && a.classId === classId && a.session === session);

/** Active students of a class that had already been admitted on `date`. */
export const classRoster = (db: Db, classId: string, date?: string) =>
  db.students.filter((s) => s.classId === classId && s.status === "Active" && (!date || s.admissionDate <= date));

/** Approved leave covering `date` — used to pre-select "Leave" when marking attendance. */
export const hasApprovedLeave = (db: Db, studentId: string, date: string) =>
  db.leaves.some((l) => l.status === "Approved" && l.studentId === studentId && l.startDate <= date && l.endDate >= date);

export function saveAttendance(
  input: { date: string; classId: string; session: Session; entries: Record<string, AttendanceMark> },
  actor: Actor,
) {
  store.update((d) => {
    let sheet = findSheet(d, input.date, input.classId, input.session);
    const isEdit = !!sheet;
    if (sheet) { sheet.entries = input.entries; sheet.markedBy = actor.id; sheet.updatedAt = nowISO(); }
    else {
      sheet = { id: uid("at"), ...input, markedBy: actor.id, updatedAt: nowISO() } as AttendanceSheet;
      d.attendance.push(sheet);
    }
    const cls = getClass(d, input.classId);
    pushActivity(d, actor, "attendance", `Attendance ${isEdit ? "updated" : "submitted"} for ${classLabel(cls)} (${input.session}) — ${input.date}`);
  });
}

/** One pass over all sheets: studentId -> counts. Use in tables to avoid N×M scans. */
export function attendanceIndex(db: Db, range?: { from?: string; to?: string }) {
  const map = new Map<string, AttendanceCounts>();
  for (const sh of db.attendance) {
    if (range?.from && sh.date < range.from) continue;
    if (range?.to && sh.date > range.to) continue;
    for (const [sid, m] of Object.entries(sh.entries)) {
      let c = map.get(sid);
      if (!c) map.set(sid, (c = emptyCounts()));
      addMark(c, m);
    }
  }
  return map;
}

export const studentAttendance = (db: Db, studentId: string, range?: { from?: string; to?: string }) =>
  attendanceIndex(db, range).get(studentId) ?? emptyCounts();

export function sheetCounts(sh: AttendanceSheet): AttendanceCounts {
  const c = emptyCounts();
  Object.values(sh.entries).forEach((m) => addMark(c, m));
  return c;
}

export interface DayAttendance {
  date: string;
  counts: AttendanceCounts;
  expected: number; // active students in classes
  pendingClasses: string[]; // class ids without a sheet
  absentees: Student[];
}

/** Attendance snapshot for one date across the (already scoped) database. */
export function dayAttendance(db: Db, date: string): DayAttendance {
  const sheets = db.attendance.filter((a) => a.date === date);
  const counts = emptyCounts();
  const absentIds: string[] = [];
  for (const sh of sheets) for (const [sid, m] of Object.entries(sh.entries)) { addMark(counts, m); if (m === "A") absentIds.push(sid); }
  const marked = new Set(sheets.map((s) => s.classId));
  return {
    date, counts,
    expected: db.students.filter((s) => s.status === "Active").length,
    pendingClasses: db.classes.filter((c) => !marked.has(c.id) && classRoster(db, c.id, date).length > 0).map((c) => c.id),
    absentees: absentIds.map((id) => db.students.find((s) => s.id === id)).filter((s): s is Student => !!s),
  };
}
