import { z } from "zod";
import { PK_PHONE, uid } from "../utils";
import { store } from "../db/store";
import type { ClassRoom, Db, Teacher } from "../types";
import { pushActivity, type Actor } from "./activity";
import { classLabel } from "./students";

export const classSchema = z.object({
  name: z.string().trim().min(2, "Enter the class name"),
  section: z.string().trim().default(""),
  kind: z.enum(["qaida", "nazra", "hifz", "nizami", "general"]),
  teacherId: z.string().min(1, "Select a teacher"),
  room: z.string().trim().default(""),
  gender: z.enum(["Male", "Female", "Mixed"]),
  subjects: z.array(z.string()).default([]),
  timetable: z.array(z.object({ day: z.string(), time: z.string(), subject: z.string() })).default([]),
});
export type ClassData = z.output<typeof classSchema>;

export function saveClass(id: string | null, input: ClassData, actor: Actor): ClassRoom {
  let saved!: ClassRoom;
  store.update((d) => {
    if (id) {
      const c = d.classes.find((x) => x.id === id);
      if (!c) throw new Error("Class not found");
      Object.assign(c, input);
      // keep the section stored on students in sync with the class
      d.students.forEach((s) => { if (s.classId === id) s.section = input.section; });
      saved = c;
    } else {
      saved = { ...input, id: uid("c") };
      d.classes.push(saved);
    }
    pushActivity(d, actor, "class", `Class ${id ? "updated" : "created"} — ${classLabel(saved)}`);
  });
  return saved;
}

export function deleteClass(id: string, actor: Actor) {
  store.update((d) => {
    const c = d.classes.find((x) => x.id === id);
    if (!c) return;
    if (d.students.some((s) => s.classId === id && s.status === "Active")) throw new Error("Move the students to another class before deleting this class");
    d.classes = d.classes.filter((x) => x.id !== id);
    pushActivity(d, actor, "class", `Class deleted — ${classLabel(c)}`);
  });
}

/** Move students into a class (used by "Assign students" on the class page). */
export function assignStudents(classId: string, studentIds: string[], actor: Actor) {
  store.update((d) => {
    const c = d.classes.find((x) => x.id === classId);
    if (!c) return;
    d.students.forEach((s) => { if (studentIds.includes(s.id)) { s.classId = classId; s.section = c.section; } });
    pushActivity(d, actor, "class", `${studentIds.length} student(s) assigned to ${classLabel(c)}`);
  });
}

export const teacherSchema = z.object({
  name: z.string().trim().min(2, "Enter the teacher's name"),
  gender: z.enum(["Male", "Female"]),
  phone: z.string().trim().regex(PK_PHONE, "Enter a valid Pakistani mobile number"),
  email: z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email").default(""),
  qualification: z.string().trim().default(""),
  specialization: z.string().trim().default(""),
  joinDate: z.string().min(1, "Select the joining date"),
  status: z.enum(["Active", "Inactive"]),
});
export type TeacherData = z.output<typeof teacherSchema>;

export function saveTeacher(id: string | null, input: TeacherData, actor: Actor): Teacher {
  let saved!: Teacher;
  store.update((d) => {
    if (id) {
      const t = d.teachers.find((x) => x.id === id);
      if (!t) throw new Error("Teacher not found");
      Object.assign(t, input);
      saved = t;
    } else {
      saved = { ...input, id: uid("t") };
      d.teachers.push(saved);
    }
    pushActivity(d, actor, "class", `Teacher ${id ? "updated" : "added"} — ${saved.name}`);
  });
  return saved;
}

export const teacherClasses = (db: Db, teacherId: string) => db.classes.filter((c) => c.teacherId === teacherId);
export const classStudentCount = (db: Db, classId: string) => db.students.filter((s) => s.classId === classId && s.status === "Active").length;
