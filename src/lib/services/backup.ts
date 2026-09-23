import { DB_VERSION } from "../constants";
import { store } from "../db/store";
import type { Db } from "../types";
import { calcAge, downloadFile, nowISO, toCSV, todayISO } from "../utils";
import { pushActivity, type Actor } from "./activity";
import { attendanceIndex } from "./attendance";
import { buildLedger } from "./fees";
import { classLabel, getClass } from "./students";

export type ExportKind = "students" | "financial" | "attendance" | "hifz" | "exams" | "donations";

export interface Dataset { headers: string[]; rows: (string | number)[][] }

/** Flat tables for CSV/Excel export. Also reused by the Reports module. */
export function buildDataset(db: Db, kind: ExportKind): Dataset {
  const cls = (id: string) => classLabel(getClass(db, id));
  const sname = (id: string) => db.students.find((s) => s.id === id)?.fullName ?? id;
  switch (kind) {
    case "students":
      return {
        headers: ["Student ID", "Name", "Father", "Gender", "Age", "DOB", "Class", "Status", "Residence", "Admission Date", "Guardian", "Relationship", "Phone", "Alt Phone", "Address", "City", "Monthly Fee", "Discount", "Nazra", "Hifz Status", "Paras Completed"],
        rows: db.students.map((s) => [s.id, s.fullName, s.fatherName, s.gender, calcAge(s.dob), s.dob, cls(s.classId), s.status, s.residence, s.admissionDate, s.guardian.name, s.guardian.relationship, s.guardian.phone, s.guardian.altPhone, s.address, s.city, s.monthlyFee, s.discount, s.nazraStatus, s.hifz.status, s.hifz.parasCompleted]),
      };
    case "financial": {
      const rows = buildLedger(db).map((r) => [
        "Fee", r.record.month, r.record.studentId, sname(r.record.studentId), r.record.category, r.record.description, r.record.amount, r.record.discount, r.paid, r.balance, r.status,
      ]);
      return { headers: ["Type", "Month", "Student ID", "Student", "Category", "Description", "Amount", "Discount", "Paid", "Balance", "Status"], rows };
    }
    case "attendance": {
      const rows: (string | number)[][] = [];
      for (const sh of db.attendance) for (const [sid, m] of Object.entries(sh.entries))
        rows.push([sh.date, sh.session, cls(sh.classId), sid, sname(sid), m === "P" ? "Present" : m === "A" ? "Absent" : "Leave"]);
      rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
      return { headers: ["Date", "Session", "Class", "Student ID", "Student", "Status"], rows };
    }
    case "hifz":
      return {
        headers: ["Date", "Student ID", "Student", "Para", "Surah", "Ayah From", "Ayah To", "Sabaq", "Sabqi", "Manzil", "Mistakes", "Quality", "Teacher", "Assessment"],
        rows: [...db.hifz].sort((a, b) => b.date.localeCompare(a.date)).map((h) => [h.date, h.studentId, sname(h.studentId), h.para, h.surah, h.ayahFrom, h.ayahTo, h.sabaq, h.sabqi, h.manzil, h.mistakes, h.quality, db.teachers.find((t) => t.id === h.teacherId)?.name ?? "", h.assessment]),
      };
    case "exams":
      return {
        headers: ["Exam", "Student ID", "Student", "Class", "Subject", "Marks", "Total", "Percentage", "Grade", "Remarks"],
        rows: db.results.map((r) => [r.exam, r.studentId, sname(r.studentId), cls(r.classId), r.subject, r.marks, r.totalMarks, r.percentage, r.grade, r.remarks]),
      };
    case "donations":
      return {
        headers: ["Receipt No", "Date", "Donor", "Phone", "Amount", "Category", "Method", "Purpose", "Notes"],
        rows: db.donations.map((d) => [d.receiptNo, d.date, d.donorName, d.phone, d.amount, d.category, d.method, d.purpose, d.notes]),
      };
  }
}

export function exportCSV(kind: ExportKind, actor: Actor) {
  const db = store.db;
  const ds = buildDataset(db, kind);
  downloadFile(`${kind}-${todayISO()}.csv`, toCSV(ds.headers, ds.rows));
  store.update((d) => {
    d.backup.lastExportAt = nowISO();
    pushActivity(d, actor, "data", `Exported ${kind} data (${ds.rows.length} rows)`);
  });
}

/** Finance export: fee ledger, receipts and donations in one workbook-friendly CSV. */
export function exportFinancial(actor: Actor) {
  const db = store.db;
  const fee = buildDataset(db, "financial");
  const pay = db.payments.map((p) => ["Receipt", p.date.slice(0, 7), p.studentId, db.students.find((s) => s.id === p.studentId)?.fullName ?? "", p.method, p.receiptNo, p.amount, "", p.amount, "", "Received"]);
  const don = db.donations.map((d) => ["Donation", d.date.slice(0, 7), "", d.donorName, d.category, d.receiptNo, d.amount, "", d.amount, "", "Received"]);
  downloadFile(`financial-${todayISO()}.csv`, toCSV(fee.headers, [...fee.rows, ...pay, ...don]));
  store.update((d) => { d.backup.lastExportAt = nowISO(); pushActivity(d, actor, "data", "Exported financial data"); });
}

/** Full JSON backup of the database. With a real backend, schedule pg_dump / Supabase backups instead. */
export function downloadBackup(actor: Actor) {
  const json = JSON.stringify(store.db, null, 2);
  downloadFile(`madrasa-backup-${todayISO()}.json`, json, "application/json;charset=utf-8");
  store.update((d) => {
    d.backup.lastBackupAt = nowISO();
    pushActivity(d, actor, "data", "Full backup downloaded");
  });
}

const REQUIRED: (keyof Db)[] = ["settings", "users", "teachers", "classes", "students", "attendance", "fees", "payments", "donations", "hifz", "results", "leaves", "messages", "activity"];

/** Restore from a backup file produced by `downloadBackup`. Replaces ALL current data. */
export function restoreBackup(text: string, actor: Actor) {
  let parsed: Db;
  try { parsed = JSON.parse(text.replace(/^﻿/, "")); } catch { throw new Error("This file is not a valid backup"); }
  if (!parsed || parsed.version !== DB_VERSION || REQUIRED.some((k) => !(k in parsed))) throw new Error("This file is not a valid madrasa backup");
  parsed.applications ||= [];
  parsed.documents ||= [];
  parsed.backup = { ...parsed.backup, lastBackupAt: parsed.backup?.lastBackupAt ?? nowISO() };
  store.replace(parsed);
  store.update((d) => pushActivity(d, actor, "data", "Data restored from backup file"));
}

export { attendanceIndex };
