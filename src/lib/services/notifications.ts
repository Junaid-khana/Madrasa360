import type { Permission } from "../auth/permissions";
import type { Db } from "../types";
import { monthOf, todayISO } from "../utils";
import { dayAttendance } from "./attendance";
import { buildLedger } from "./fees";

export interface AppNotification { id: string; tone: "amber" | "red" | "blue"; text: string; vars?: Record<string, number>; href: string }

/** Derived alerts (no separate table): what needs the user's attention right now. */
export function buildNotifications(db: Db, can: (p: Permission) => boolean, today = todayISO()): AppNotification[] {
  const out: AppNotification[] = [];
  if (can("leave.manage") && db.settings.notifications.leaveRequests) {
    const n = db.leaves.filter((l) => l.status === "Pending").length;
    if (n) out.push({ id: "leave", tone: "amber", text: "{n} leave request(s) waiting for approval", vars: { n }, href: "/leave" });
  }
  if (can("attendance.mark")) {
    const n = dayAttendance(db, today).pendingClasses.length;
    if (n) out.push({ id: "att", tone: "amber", text: "Attendance not yet marked today for {n} class(es)", vars: { n }, href: "/attendance" });
  }
  if (can("fees.manage") && db.settings.notifications.feeReminders) {
    const month = monthOf(today);
    const overdue = new Set(buildLedger(db).filter((r) => r.balance > 0 && r.record.month < month).map((r) => r.record.studentId));
    if (overdue.size) out.push({ id: "fees", tone: "red", text: "{n} student(s) have overdue fees from earlier months", vars: { n: overdue.size }, href: "/fees" });
  }
  if (can("admissions.manage")) {
    const n = db.applications.filter((a) => a.status === "New").length;
    if (n) out.push({ id: "adm", tone: "blue", text: "{n} new admission application(s)", vars: { n }, href: "/admissions" });
  }
  if (can("data.manage") && db.settings.notifications.backupReminder) {
    const last = db.backup.lastBackupAt ? new Date(db.backup.lastBackupAt).getTime() : 0;
    if (Date.now() - last > 7 * 86400_000) out.push({ id: "backup", tone: "amber", text: "No backup in the last 7 days", href: "/settings?tab=data" });
  }
  return out;
}
