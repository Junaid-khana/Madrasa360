import { z } from "zod";
import { store } from "../db/store";
import type { ClassRoom, Db, HifzProfile, Student } from "../types";
import { PK_PHONE, calcAge, nowISO, pct, todayISO } from "../utils";
import { pushActivity, type Actor } from "./activity";

/* ---------- validation ---------- */
const phone = z.string().trim().regex(PK_PHONE, "Enter a valid Pakistani mobile number, e.g. 0300-1234567");
const optionalPhone = z.string().trim().refine((v) => !v || PK_PHONE.test(v), "Enter a valid Pakistani mobile number");

export const studentSchema = z.object({
  id: z.string().trim().min(1, "Student ID is required"),
  fullName: z.string().trim().min(2, "Enter the student's full name"),
  fatherName: z.string().trim().min(2, "Enter the father's name"),
  dob: z.string().min(1, "Date of birth is required").refine((v) => { const a = calcAge(v); return a >= 3 && a <= 25; }, "Please check the date of birth"),
  gender: z.enum(["Male", "Female"]),
  bForm: z.string().trim().refine((v) => !v || /^\d{5}-?\d{7}-?\d$/.test(v), "B-Form format: 12345-1234567-1").optional().default(""),
  photo: z.string().default(""),
  address: z.string().trim().min(3, "Enter the address"),
  city: z.string().trim().min(2, "Enter the city"),
  province: z.string().min(1, "Select a province"),
  guardian: z.object({
    name: z.string().trim().min(2, "Enter the guardian's name"),
    relationship: z.string().min(1, "Select the relationship"),
    phone,
    altPhone: optionalPhone.default(""),
    email: z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email").default(""),
    address: z.string().trim().default(""),
  }),
  admissionDate: z.string().min(1, "Admission date is required"),
  previousSchool: z.string().trim().default(""),
  classId: z.string().min(1, "Select a class"),
  section: z.string().trim().default(""),
  status: z.enum(["Active", "Archived", "Left", "Graduated"]),
  residence: z.enum(["Day Scholar", "Hostel"]),
  monthlyFee: z.coerce.number().min(0, "Fee cannot be negative"),
  discount: z.coerce.number().min(0, "Discount cannot be negative"),
  nazraStatus: z.enum(["Not Started", "In Progress", "Completed"]),
  hifz: z.object({
    status: z.enum(["Not Started", "In Progress", "Completed"]),
    startDate: z.string().default(""),
    currentPara: z.coerce.number().int().min(1).max(30),
    currentSurah: z.string().default(""),
    parasCompleted: z.coerce.number().int().min(0).max(30).default(0),
    dailyLesson: z.string().default(""),
    previousLesson: z.string().default(""),
    revision: z.string().default(""),
    remarks: z.string().default(""),
  }),
}).refine((s) => s.discount <= s.monthlyFee, { path: ["discount"], message: "Discount cannot exceed the monthly fee" });

export type StudentInput = z.input<typeof studentSchema>;
export type StudentData = z.output<typeof studentSchema>;

export function blankHifz(): HifzProfile {
  return { status: "Not Started", startDate: "", currentPara: 1, currentSurah: "", parasCompleted: 0, dailyLesson: "", previousLesson: "", revision: "", remarks: "" };
}

/* ---------- lookups ---------- */
export const classLabel = (c?: Pick<ClassRoom, "name" | "section">) => (c ? `${c.name}${c.section ? ` – ${c.section}` : ""}` : "—");
export const getClass = (db: Db, id: string) => db.classes.find((c) => c.id === id);
export const getStudent = (db: Db, id: string) => db.students.find((s) => s.id === id);
export const getTeacher = (db: Db, id: string) => db.teachers.find((t) => t.id === id);
export const studentClassLabel = (db: Db, s: Student) => classLabel(getClass(db, s.classId));
export const activeStudents = (db: Db) => db.students.filter((s) => s.status === "Active");
export const nextStudentId = (db: Db) => `MDR-${String(db.counters.student + 1).padStart(4, "0")}`;
export const userName = (db: Db, id: string) => db.users.find((u) => u.id === id)?.name ?? "—";
export const hifzProgressPercent = (s: Pick<Student, "hifz">) => Math.round((s.hifz.parasCompleted / 30) * 100);
export const netMonthlyFee = (s: Pick<Student, "monthlyFee" | "discount">) => Math.max(0, s.monthlyFee - s.discount);

/* ---------- mutations ---------- */
export function createStudent(input: StudentData, actor: Actor, applicationId?: string): Student {
  let created!: Student;
  store.update((d) => {
    if (d.students.some((s) => s.id === input.id)) throw new Error(`Student ID ${input.id} already exists`);
    created = { ...input, createdAt: nowISO() } as Student;
    d.students.push(created);
    d.counters.student = Math.max(d.counters.student, Number(input.id.replace(/\D/g, "")) || d.counters.student + 1);
    if (applicationId) {
      const app = d.applications.find((a) => a.id === applicationId);
      if (app) { app.status = "Admitted"; app.studentId = created.id; }
    }
    // Charge admission fee for the admission month so Fees shows it immediately.
    if (d.settings.admissionFee > 0) {
      d.fees.push({
        id: `f_${created.id}_adm`, studentId: created.id, month: input.admissionDate.slice(0, 7), category: "Admission Fee",
        description: "Admission fee", amount: d.settings.admissionFee, discount: 0, waived: false, createdAt: nowISO(),
      });
    }
    pushActivity(d, actor, "student", `New student admitted — ${created.fullName} (${created.id})`, created.id);
  });
  return created;
}

export function updateStudent(id: string, input: StudentData, actor: Actor) {
  store.update((d) => {
    const i = d.students.findIndex((s) => s.id === id);
    if (i < 0) throw new Error("Student not found");
    d.students[i] = { ...d.students[i], ...input, id };
    pushActivity(d, actor, "student", `Student record updated — ${input.fullName} (${id})`, id);
  });
}

export function archiveStudent(id: string, actor: Actor) {
  store.update((d) => {
    const s = d.students.find((x) => x.id === id);
    if (!s) return;
    s.status = "Archived"; s.archivedAt = nowISO();
    pushActivity(d, actor, "student", `Student archived — ${s.fullName} (${id})`, id);
  });
}

export function restoreStudent(id: string, actor: Actor) {
  store.update((d) => {
    const s = d.students.find((x) => x.id === id);
    if (!s) return;
    s.status = "Active"; delete s.archivedAt;
    pushActivity(d, actor, "student", `Student restored — ${s.fullName} (${id})`, id);
  });
}

/** Permanent removal (Super Admin only). Removes the student from every related table. */
export function deleteStudentPermanently(id: string, actor: Actor) {
  store.update((d) => {
    const s = d.students.find((x) => x.id === id);
    if (!s) return;
    const feeIds = new Set(d.fees.filter((f) => f.studentId === id).map((f) => f.id));
    d.students = d.students.filter((x) => x.id !== id);
    d.fees = d.fees.filter((f) => f.studentId !== id);
    d.payments = d.payments.filter((p) => p.studentId !== id || p.allocations.some((a) => !feeIds.has(a.feeId)));
    d.hifz = d.hifz.filter((h) => h.studentId !== id);
    d.results = d.results.filter((r) => r.studentId !== id);
    d.leaves = d.leaves.filter((l) => l.studentId !== id);
    d.documents = d.documents.filter((x) => x.studentId !== id);
    d.attendance.forEach((a) => { delete a.entries[id]; });
    pushActivity(d, actor, "student", `Student permanently deleted — ${s.fullName} (${id})`);
  });
}

export function addDocument(studentId: string, name: string, type: string, sizeKb: number, actor: Actor) {
  store.update((d) => {
    d.documents.push({ id: `doc_${Date.now().toString(36)}`, studentId, name, type, uploadedAt: nowISO(), sizeKb });
    pushActivity(d, actor, "student", `Document added for ${studentId}: ${name}`, studentId);
  });
}
export function removeDocument(id: string, actor: Actor) {
  store.update((d) => {
    const doc = d.documents.find((x) => x.id === id);
    d.documents = d.documents.filter((x) => x.id !== id);
    if (doc) pushActivity(d, actor, "student", `Document removed for ${doc.studentId}: ${doc.name}`, doc.studentId);
  });
}

/** Default values for the "Add student" form. */
export function blankStudent(db: Db, classId = ""): StudentInput {
  const c = getClass(db, classId);
  return {
    id: nextStudentId(db), fullName: "", fatherName: "", dob: "", gender: c?.gender === "Female" ? "Female" : "Male", bForm: "", photo: "",
    address: "", city: "Lahore", province: "Punjab",
    guardian: { name: "", relationship: "Father", phone: "", altPhone: "", email: "", address: "" },
    admissionDate: todayISO(), previousSchool: "", classId, section: c?.section ?? "", status: "Active", residence: "Day Scholar",
    monthlyFee: db.settings.defaultMonthlyFee, discount: 0, nazraStatus: "Not Started", hifz: blankHifz(),
  };
}

export { pct };
