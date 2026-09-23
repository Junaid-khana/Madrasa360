import type { Db, Role, Student } from "../types";

export type Permission =
  | "dashboard.view"
  | "students.view" | "students.edit" | "students.archive" | "students.delete"
  | "admissions.manage"
  | "classes.view" | "classes.manage" | "teachers.manage"
  | "attendance.view" | "attendance.mark"
  | "hifz.view" | "hifz.record"
  | "academics.view" | "academics.record"
  | "fees.view" | "fees.manage"
  | "donations.manage"
  | "leave.view" | "leave.manage"
  | "communication.send"
  | "reports.view" | "reports.financial"
  | "users.manage" | "settings.manage" | "data.manage";

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view", "students.view", "students.edit", "students.archive", "students.delete", "admissions.manage",
  "classes.view", "classes.manage", "teachers.manage", "attendance.view", "attendance.mark", "hifz.view", "hifz.record",
  "academics.view", "academics.record", "fees.view", "fees.manage", "donations.manage", "leave.view", "leave.manage",
  "communication.send", "reports.view", "reports.financial", "users.manage", "settings.manage", "data.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: [
    "dashboard.view", "students.view", "students.edit", "students.archive", "admissions.manage",
    "classes.view", "classes.manage", "teachers.manage", "attendance.view", "attendance.mark", "hifz.view", "hifz.record",
    "academics.view", "academics.record", "fees.view", "fees.manage", "leave.view", "leave.manage",
    "communication.send", "reports.view", "reports.financial",
  ],
  teacher: [
    "dashboard.view", "students.view", "classes.view", "attendance.view", "attendance.mark",
    "hifz.view", "hifz.record", "academics.view", "academics.record", "leave.view", "reports.view",
  ],
  accountant: [
    "dashboard.view", "students.view", "fees.view", "fees.manage", "donations.manage", "reports.financial",
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin", admin: "Administrator", teacher: "Teacher", accountant: "Accountant",
};
export const ROLES: Role[] = ["super_admin", "admin", "teacher", "accountant"];

export const roleCan = (role: Role, p: Permission) => ROLE_PERMISSIONS[role].includes(p);

/** Which class ids can this user see? `null` means "all classes". Teachers only see their own. */
export function visibleClassIds(db: Db, user: { role: Role; teacherId?: string }): Set<string> | null {
  if (user.role !== "teacher") return null;
  return new Set(db.classes.filter((c) => c.teacherId === user.teacherId).map((c) => c.id));
}

/**
 * Returns a view of the database limited to what the user may see.
 * Teachers only get their assigned classes' students and records (student data is sensitive,
 * so this is applied centrally rather than page by page).
 */
export function scopeDb(db: Db, user: { role: Role; teacherId?: string }): Db {
  const ids = visibleClassIds(db, user);
  if (!ids) return db;
  const students = db.students.filter((s) => ids.has(s.classId));
  const sids = new Set(students.map((s) => s.id));
  return {
    ...db,
    classes: db.classes.filter((c) => ids.has(c.id)),
    students,
    attendance: db.attendance.filter((a) => ids.has(a.classId)),
    hifz: db.hifz.filter((h) => sids.has(h.studentId)),
    results: db.results.filter((r) => sids.has(r.studentId)),
    leaves: db.leaves.filter((l) => sids.has(l.studentId)),
    documents: db.documents.filter((d) => sids.has(d.studentId)),
    fees: [], payments: [], donations: [], messages: [], applications: [],
  };
}

export type ScopedStudent = Student;
