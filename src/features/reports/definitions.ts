import type { Permission } from "@/lib/auth/permissions";
import { DONATION_CATEGORIES, PASS_PERCENT, STUDENT_STATUSES } from "@/lib/constants";
import { attendanceIndex, sheetCounts } from "@/lib/services/attendance";
import { classTotals, examNames } from "@/lib/services/exams";
import { buildLedger } from "@/lib/services/fees";
import { hifzProgressPercent, classLabel, getClass, getTeacher, userName } from "@/lib/services/students";
import { hifzStats, revisionStatus, studentHifz } from "@/lib/services/hifz";
import type { Db, Student } from "@/lib/types";
import { addMonths, calcAge, monthOf, parseISO, pct, sum, todayISO } from "@/lib/utils";

export type FilterKey = "dateRange" | "class" | "gender" | "status" | "search" | "month";

export interface ReportFilters { from: string; to: string; classId: string; gender: string; status: string; q: string; month: string }
export const EMPTY_FILTERS: ReportFilters = { from: "", to: "", classId: "", gender: "", status: "", q: "", month: "" };

export interface SummaryItem { label: string; value: string | number; money?: boolean }
export interface ReportResult {
  columns: string[];
  rows: (string | number)[][];
  /** Column indexes that hold money amounts (formatted as Rs). */
  money?: number[];
  summary?: SummaryItem[];
}

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  perm: Permission;
  filters: FilterKey[];
  statusLabel?: string;
  statusOptions?: (db: Db) => string[];
  defaults?: (today: string) => Partial<ReportFilters>;
  build(db: Db, f: ReportFilters): ReportResult;
}

/* ---------- helpers ---------- */
const cls = (db: Db, id: string) => classLabel(getClass(db, id));
const inRange = (d: string, f: ReportFilters) => (!f.from || d >= f.from) && (!f.to || d <= f.to);
const matches = (f: ReportFilters, ...vals: (string | number)[]) => !f.q.trim() || vals.join(" ").toLowerCase().includes(f.q.trim().toLowerCase());
const byName = (a: Student, b: Student) => a.fullName.localeCompare(b.fullName);
const thisMonthStart = (today: string) => `${monthOf(today)}-01`;

function pickStudents(db: Db, f: ReportFilters, opts: { activeOnly?: boolean } = {}): Student[] {
  return db.students
    .filter((s) => (!opts.activeOnly || s.status === "Active") && (!f.classId || s.classId === f.classId) && (!f.gender || s.gender === f.gender))
    .filter((s) => matches(f, s.fullName, s.id, s.fatherName, s.guardian.name, s.guardian.phone))
    .sort((a, b) => cls(db, a.classId).localeCompare(cls(db, b.classId)) || byName(a, b));
}

const overlapDays = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400_000) + 1;

/* ---------- report registry ---------- */
export const REPORTS: ReportDef[] = [
  {
    id: "students", title: "Student list", description: "All students with class, guardian and status.", perm: "reports.view",
    filters: ["class", "gender", "status", "search"], statusLabel: "Status", statusOptions: () => STUDENT_STATUSES, defaults: () => ({ status: "Active" }),
    build(db, f) {
      const list = pickStudents(db, f).filter((s) => !f.status || s.status === f.status);
      return {
        columns: ["Student ID", "Name", "Father", "Gender", "Age", "Class", "Guardian", "Phone", "Admission Date", "Status"],
        rows: list.map((s) => [s.id, s.fullName, s.fatherName, s.gender, calcAge(s.dob), cls(db, s.classId), s.guardian.name, s.guardian.phone, s.admissionDate, s.status]),
        summary: [
          { label: "Total", value: list.length },
          { label: "Male", value: list.filter((s) => s.gender === "Male").length },
          { label: "Female", value: list.filter((s) => s.gender === "Female").length },
        ],
      };
    },
  },
  {
    id: "admissions", title: "Admission report", description: "Students admitted in a period.", perm: "reports.view",
    filters: ["dateRange", "class", "gender", "search"],
    build(db, f) {
      const list = pickStudents(db, f).filter((s) => inRange(s.admissionDate, f)).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate));
      return {
        columns: ["Admission Date", "Student ID", "Name", "Gender", "Age", "Class", "Residence", "Guardian", "Phone"],
        rows: list.map((s) => [s.admissionDate, s.id, s.fullName, s.gender, calcAge(s.dob), cls(db, s.classId), s.residence, s.guardian.name, s.guardian.phone]),
        summary: [
          { label: "Admitted", value: list.length },
          { label: "Boys", value: list.filter((s) => s.gender === "Male").length },
          { label: "Girls", value: list.filter((s) => s.gender === "Female").length },
        ],
      };
    },
  },
  {
    id: "gender", title: "Gender report", description: "Boys and girls in every class.", perm: "reports.view",
    filters: ["class"],
    build(db, f) {
      const active = db.students.filter((s) => s.status === "Active");
      const rows = db.classes.filter((c) => !f.classId || c.id === f.classId).map((c) => {
        const l = active.filter((s) => s.classId === c.id);
        const m = l.filter((s) => s.gender === "Male").length;
        return [classLabel(c), m, l.length - m, l.length, pct(m, l.length), pct(l.length - m, l.length)];
      });
      const tm = sum(rows.map((r) => r[1] as number)), tf = sum(rows.map((r) => r[2] as number)), tt = tm + tf;
      rows.push(["Total", tm, tf, tt, pct(tm, tt), pct(tf, tt)]);
      return { columns: ["Class", "Boys", "Girls", "Total", "Boys %", "Girls %"], rows, summary: [{ label: "Boys", value: tm }, { label: "Girls", value: tf }, { label: "Total", value: tt }] };
    },
  },
  {
    id: "age", title: "Age report", description: "Number of students by age.", perm: "reports.view",
    filters: ["class", "gender"],
    build(db, f) {
      const list = pickStudents(db, f, { activeOnly: true });
      const ages = list.map((s) => calcAge(s.dob));
      const rows: (string | number)[][] = [];
      if (ages.length) for (let a = Math.min(...ages); a <= Math.max(...ages); a++) {
        const l = list.filter((s) => calcAge(s.dob) === a);
        rows.push([a, l.filter((s) => s.gender === "Male").length, l.filter((s) => s.gender === "Female").length, l.length]);
      }
      rows.push(["Total", list.filter((s) => s.gender === "Male").length, list.filter((s) => s.gender === "Female").length, list.length]);
      return {
        columns: ["Age", "Boys", "Girls", "Total"], rows,
        summary: [{ label: "Students", value: list.length }, { label: "Average age", value: ages.length ? Math.round((sum(ages) / ages.length) * 10) / 10 : 0 }],
      };
    },
  },
  {
    id: "classes", title: "Class report", description: "Teacher, strength and attendance of each class.", perm: "reports.view",
    filters: ["class", "dateRange"],
    build(db, f) {
      const rows = db.classes.filter((c) => !f.classId || c.id === f.classId).map((c) => {
        const l = db.students.filter((s) => s.classId === c.id && s.status === "Active");
        const m = l.filter((s) => s.gender === "Male").length;
        let present = 0, total = 0;
        for (const sh of db.attendance) if (sh.classId === c.id && inRange(sh.date, f)) { const k = sheetCounts(sh); present += k.present; total += k.total; }
        return [classLabel(c), getTeacher(db, c.teacherId)?.name ?? "—", c.room, c.gender, l.length, m, l.length - m, total ? pct(present, total) : "—"];
      });
      return {
        columns: ["Class", "Teacher", "Room", "Gender", "Students", "Boys", "Girls", "Attendance %"], rows,
        summary: [{ label: "Classes", value: rows.length }, { label: "Students", value: sum(rows.map((r) => r[4] as number)) }],
      };
    },
  },
  {
    id: "attendance", title: "Attendance report", description: "Present, absent and leave days per student.", perm: "reports.view",
    filters: ["dateRange", "class", "gender", "search"], defaults: (t) => ({ from: thisMonthStart(t), to: t }),
    build(db, f) {
      const idx = attendanceIndex(db, { from: f.from || undefined, to: f.to || undefined });
      const list = pickStudents(db, f, { activeOnly: true });
      let P = 0, A = 0, L = 0;
      const rows = list.map((s) => {
        const c = idx.get(s.id);
        P += c?.present ?? 0; A += c?.absent ?? 0; L += c?.leave ?? 0;
        return [s.id, s.fullName, cls(db, s.classId), s.gender, c?.present ?? 0, c?.absent ?? 0, c?.leave ?? 0, c?.total ?? 0, c ? c.percent : "—"];
      });
      return {
        columns: ["Student ID", "Name", "Class", "Gender", "Present", "Absent", "Leave", "Total days", "Attendance %"], rows,
        summary: [{ label: "Present", value: P }, { label: "Absent", value: A }, { label: "Leave", value: L }, { label: "Attendance %", value: `${pct(P, P + A + L)}%` }],
      };
    },
  },
  {
    id: "fee-collection", title: "Fee collection report", description: "Receipts issued in a period.", perm: "reports.financial",
    filters: ["dateRange", "class", "search"], defaults: (t) => ({ from: thisMonthStart(t), to: t }),
    build(db, f) {
      const st = new Map(db.students.map((s) => [s.id, s]));
      const list = db.payments
        .filter((p) => inRange(p.date, f) && (!f.classId || st.get(p.studentId)?.classId === f.classId))
        .filter((p) => matches(f, p.receiptNo, p.studentId, st.get(p.studentId)?.fullName ?? ""))
        .sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo.localeCompare(a.receiptNo));
      const total = sum(list.map((p) => p.amount));
      const byMethod = new Map<string, number>();
      list.forEach((p) => byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount));
      return {
        columns: ["Receipt No", "Date", "Student ID", "Student", "Class", "Method", "Amount", "Received by"],
        rows: list.map((p) => { const s = st.get(p.studentId); return [p.receiptNo, p.date, p.studentId, s?.fullName ?? "—", s ? cls(db, s.classId) : "—", p.method, p.amount, userName(db, p.receivedBy)]; }),
        money: [6],
        summary: [{ label: "Total collected", value: total, money: true }, { label: "Receipts", value: list.length }, ...[...byMethod].map(([m, v]) => ({ label: m, value: v, money: true }))],
      };
    },
  },
  {
    id: "outstanding", title: "Outstanding fee report", description: "Students with unpaid balances.", perm: "reports.financial",
    filters: ["month", "class", "search"],
    build(db, f) {
      const st = new Map(db.students.map((s) => [s.id, s]));
      const per = new Map<string, { n: number; oldest: string; amt: number }>();
      for (const r of buildLedger(db)) {
        if (r.balance <= 0 || (f.month && r.record.month !== f.month)) continue;
        const cur = per.get(r.record.studentId) ?? { n: 0, oldest: r.record.month, amt: 0 };
        cur.n++; cur.amt += r.balance; if (r.record.month < cur.oldest) cur.oldest = r.record.month;
        per.set(r.record.studentId, cur);
      }
      const rows = [...per]
        .map(([id, v]) => ({ s: st.get(id), v }))
        .filter((x): x is { s: Student; v: { n: number; oldest: string; amt: number } } => !!x.s)
        .filter((x) => (!f.classId || x.s.classId === f.classId) && matches(f, x.s.fullName, x.s.id, x.s.guardian.name, x.s.guardian.phone))
        .sort((a, b) => b.v.amt - a.v.amt);
      return {
        columns: ["Student ID", "Name", "Class", "Guardian", "Phone", "Unpaid charges", "Oldest month", "Outstanding"],
        rows: rows.map(({ s, v }) => [s.id, s.fullName, cls(db, s.classId), s.guardian.name, s.guardian.phone, v.n, v.oldest, v.amt]),
        money: [7],
        summary: [{ label: "Total outstanding", value: sum(rows.map((x) => x.v.amt)), money: true }, { label: "Students", value: rows.length }],
      };
    },
  },
  {
    id: "donations", title: "Donation report", description: "Donations received, by donor and category.", perm: "reports.financial",
    filters: ["dateRange", "status", "search"], statusLabel: "Category", statusOptions: () => DONATION_CATEGORIES, defaults: (t) => ({ from: `${addMonths(monthOf(t), -2)}-01`, to: t }),
    build(db, f) {
      const list = db.donations
        .filter((d) => inRange(d.date, f) && (!f.status || d.category === f.status) && matches(f, d.donorName, d.receiptNo, d.phone, d.purpose))
        .sort((a, b) => b.date.localeCompare(a.date));
      const total = sum(list.map((d) => d.amount));
      return {
        columns: ["Receipt No", "Date", "Donor", "Phone", "Category", "Method", "Purpose", "Amount"],
        rows: list.map((d) => [d.receiptNo, d.date, d.donorName, d.phone, d.category, d.method, d.purpose, d.amount]),
        money: [7],
        summary: [{ label: "Total donations", value: total, money: true }, { label: "Donations", value: list.length }, { label: "Average", value: list.length ? total / list.length : 0, money: true }],
      };
    },
  },
  {
    id: "hifz", title: "Hifz progress report", description: "Current para, paras completed and revision status.", perm: "reports.view",
    filters: ["class", "gender", "status", "search"], statusLabel: "Hifz status", statusOptions: () => ["In Progress", "Completed"],
    build(db, f) {
      const today = todayISO();
      const list = pickStudents(db, f, { activeOnly: true }).filter((s) => s.hifz.status !== "Not Started" && (!f.status || s.hifz.status === f.status));
      const st = hifzStats({ ...db, students: list });
      const rows = list.map((s) => {
        const recs = studentHifz(db, s.id);
        const recent = recs.filter((r) => r.date >= new Date(parseISO(today).getTime() - 7 * 86400_000).toISOString().slice(0, 10));
        return [
          s.id, s.fullName, cls(db, s.classId), s.hifz.status, s.hifz.currentPara, s.hifz.currentSurah || "—", s.hifz.parasCompleted, hifzProgressPercent(s),
          recs[0]?.date ?? "—", s.hifz.status === "Completed" ? "Regular" : revisionStatus(recs, today), recent.length ? Math.round((sum(recent.map((r) => r.mistakes)) / recent.length) * 10) / 10 : "—",
        ];
      });
      return {
        columns: ["Student ID", "Name", "Class", "Hifz status", "Current Para", "Current Surah", "Paras completed", "Progress %", "Last entry", "Revision", "Avg mistakes (7 days)"], rows,
        summary: [{ label: "Students", value: list.length }, { label: "Average progress", value: `${st.avgProgress}%` }, { label: "Total paras", value: st.totalParas }, { label: "Needs attention", value: st.needsAttention }],
      };
    },
  },
  {
    id: "exams", title: "Exam results", description: "Class-wise totals, grades and positions.", perm: "reports.view",
    filters: ["status", "class", "search"], statusLabel: "Exam", statusOptions: (db) => examNames(db), defaults: () => ({}),
    build(db, f) {
      const exam = f.status || examNames(db)[0] || "";
      const st = new Map(db.students.map((s) => [s.id, s]));
      const rows: (string | number)[][] = [];
      const pcts: number[] = [];
      for (const c of db.classes.filter((x) => !f.classId || x.id === f.classId)) {
        classTotals(db, c.id, exam).forEach((t, i) => {
          const s = st.get(t.studentId);
          if (!s || !matches(f, s.fullName, s.id)) return;
          pcts.push(t.percentage);
          rows.push([i + 1, s.id, s.fullName, classLabel(c), t.marks, t.total, t.percentage, t.grade, t.percentage >= PASS_PERCENT ? "Pass" : "Fail"]);
        });
      }
      return {
        columns: ["Position", "Student ID", "Name", "Class", "Marks", "Total", "Percentage", "Grade", "Result"], rows,
        summary: [
          { label: "Exam", value: exam || "—" }, { label: "Students", value: rows.length },
          { label: "Average %", value: pcts.length ? Math.round((sum(pcts) / pcts.length) * 10) / 10 : 0 },
          { label: "Pass rate", value: `${pct(pcts.filter((p) => p >= PASS_PERCENT).length, pcts.length)}%` },
        ],
      };
    },
  },
  {
    id: "leave", title: "Leave report", description: "Leave applications and their decisions.", perm: "reports.view",
    filters: ["dateRange", "class", "status", "search"], statusLabel: "Status", statusOptions: () => ["Pending", "Approved", "Rejected"],
    build(db, f) {
      const st = new Map(db.students.map((s) => [s.id, s]));
      const list = db.leaves
        .filter((l) => (!f.from || l.endDate >= f.from) && (!f.to || l.startDate <= f.to) && (!f.status || l.status === f.status))
        .filter((l) => { const s = st.get(l.studentId); return !!s && (!f.classId || s.classId === f.classId) && matches(f, s.fullName, s.id, l.reason); })
        .sort((a, b) => b.startDate.localeCompare(a.startDate));
      return {
        columns: ["Student ID", "Name", "Class", "Leave type", "From", "To", "Days", "Reason", "Status", "Approved by"],
        rows: list.map((l) => { const s = st.get(l.studentId)!; return [s.id, s.fullName, cls(db, s.classId), l.type, l.startDate, l.endDate, overlapDays(l.startDate, l.endDate), l.reason, l.status, l.approvedBy || "—"]; }),
        summary: [
          { label: "Applications", value: list.length },
          { label: "Approved", value: list.filter((l) => l.status === "Approved").length },
          { label: "Pending", value: list.filter((l) => l.status === "Pending").length },
          { label: "Rejected", value: list.filter((l) => l.status === "Rejected").length },
        ],
      };
    },
  },
];

export const reportById = (id: string) => REPORTS.find((r) => r.id === id);
