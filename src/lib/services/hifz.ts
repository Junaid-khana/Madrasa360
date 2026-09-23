import { z } from "zod";
import { PARA_SURAH } from "../constants";
import { store } from "../db/store";
import type { Db, HifzQuality, HifzRecord, Student } from "../types";
import { addDays, sum, todayISO, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";
import { hifzProgressPercent } from "./students";

export const hifzSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  date: z.string().min(1, "Select the date"),
  para: z.coerce.number().int().min(1, "Para 1–30").max(30, "Para 1–30"),
  surah: z.string().min(1, "Select the surah"),
  ayahFrom: z.coerce.number().int().min(1, "Enter ayah"),
  ayahTo: z.coerce.number().int().min(1, "Enter ayah"),
  sabaq: z.string().trim().min(1, "Enter today's Sabaq"),
  sabqi: z.string().trim().default(""),
  manzil: z.string().trim().default(""),
  mistakes: z.coerce.number().int().min(0).default(0),
  quality: z.enum(["Excellent", "Good", "Average", "Weak"]),
  assessment: z.string().trim().default(""),
  teacherId: z.string().default(""),
  paraCompleted: z.boolean().default(false),
}).refine((h) => h.ayahTo >= h.ayahFrom, { path: ["ayahTo"], message: "Must be after the first ayah" });
export type HifzInput = z.input<typeof hifzSchema>;

/** Save a Hifz entry and update the student's Hifz profile (current para/surah, lessons, progress). */
export function addHifzRecord(input: z.output<typeof hifzSchema>, actor: Actor): HifzRecord {
  let saved!: HifzRecord;
  store.update((d) => {
    const s = d.students.find((x) => x.id === input.studentId);
    if (!s) throw new Error("Student not found");
    saved = { ...input, id: uid("h"), quality: input.quality as HifzQuality };
    d.hifz.push(saved);
    const h = s.hifz;
    if (h.status === "Not Started") { h.status = "In Progress"; h.startDate = input.date; }
    h.currentPara = input.para;
    h.currentSurah = input.surah;
    h.dailyLesson = input.sabaq;
    h.previousLesson = input.sabqi;
    h.revision = input.manzil;
    h.remarks = input.assessment;
    if (input.paraCompleted) {
      h.parasCompleted = Math.min(30, h.parasCompleted + 1);
      h.currentPara = Math.min(30, input.para + 1);
      h.currentSurah = PARA_SURAH[h.currentPara - 1];
      if (h.parasCompleted >= 30) h.status = "Completed";
    }
    pushActivity(d, actor, "hifz", `Hifz progress updated for ${s.fullName} — ${input.sabaq}`, s.id);
  });
  return saved;
}

export const studentHifz = (db: Db, studentId: string) =>
  db.hifz.filter((h) => h.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

export type RevisionStatus = "Regular" | "Needs attention" | "No recent record";

/** Simple, explainable rule: recent entries + mistakes + quality over the last 7 days. */
export function revisionStatus(records: HifzRecord[], today = todayISO()): RevisionStatus {
  const recent = records.filter((r) => r.date >= addDays(today, -7));
  if (!recent.length) return "No recent record";
  const weak = recent.filter((r) => r.quality === "Weak" || r.mistakes >= 5).length;
  return weak / recent.length > 0.4 || recent.length < 2 ? "Needs attention" : "Regular";
}

export interface HifzStats {
  inProgress: number;
  completed: number;
  recordedToday: number;
  avgProgress: number;
  totalParas: number;
  needsAttention: number;
  buckets: { label: string; count: number }[];
}
export function hifzStats(db: Db, today = todayISO()): HifzStats {
  const hs: Student[] = db.students.filter((s) => s.status === "Active" && s.hifz.status !== "Not Started");
  const inProg = hs.filter((s) => s.hifz.status === "In Progress");
  const byStudent = new Map<string, HifzRecord[]>();
  for (const r of db.hifz) (byStudent.get(r.studentId) ?? byStudent.set(r.studentId, []).get(r.studentId)!).push(r);
  const bands: [string, number, number][] = [["0–5", 0, 5], ["6–10", 6, 10], ["11–15", 11, 15], ["16–20", 16, 20], ["21–29", 21, 29], ["30", 30, 30]];
  return {
    inProgress: inProg.length,
    completed: hs.filter((s) => s.hifz.status === "Completed").length,
    recordedToday: new Set(db.hifz.filter((r) => r.date === today).map((r) => r.studentId)).size,
    avgProgress: hs.length ? Math.round(sum(hs.map(hifzProgressPercent)) / hs.length) : 0,
    totalParas: sum(hs.map((s) => s.hifz.parasCompleted)),
    needsAttention: inProg.filter((s) => revisionStatus(byStudent.get(s.id) ?? [], today) === "Needs attention").length,
    buckets: bands.map(([label, lo, hi]) => ({ label, count: hs.filter((s) => s.hifz.parasCompleted >= lo && s.hifz.parasCompleted <= hi).length })),
  };
}
