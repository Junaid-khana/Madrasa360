import { z } from "zod";
import { store } from "../db/store";
import type { AdmissionApplication, AdmissionStatus, Db } from "../types";
import { PK_PHONE, todayISO } from "../utils";
import { pushActivity, type Actor } from "./activity";
import { blankStudent, getClass, type StudentInput } from "./students";

export const applicationSchema = z.object({
  applicantName: z.string().trim().min(2, "Enter the applicant's name"),
  fatherName: z.string().trim().min(2, "Enter the father's name"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female"]),
  guardianPhone: z.string().trim().regex(PK_PHONE, "Enter a valid Pakistani mobile number"),
  address: z.string().trim().default(""),
  appliedClassId: z.string().min(1, "Select a class"),
  previousSchool: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export function createApplication(input: z.output<typeof applicationSchema>, actor: Actor) {
  store.update((d) => {
    d.counters.application += 1;
    d.applications.push({
      ...input, id: `APP-${String(d.counters.application).padStart(4, "0")}`, appliedDate: todayISO(), status: "New",
    });
    pushActivity(d, actor, "admission", `Admission application received — ${input.applicantName}`);
  });
}

export function setApplicationStatus(id: string, status: AdmissionStatus, actor: Actor) {
  store.update((d) => {
    const a = d.applications.find((x) => x.id === id);
    if (!a) return;
    a.status = status;
    pushActivity(d, actor, "admission", `Application ${a.id} (${a.applicantName}) marked ${status}`);
  });
}

/** Pre-fill the student registration form from an application ("Admit" action). */
export function applicationToStudent(db: Db, app: AdmissionApplication): StudentInput {
  const base = blankStudent(db, app.appliedClassId);
  const cls = getClass(db, app.appliedClassId);
  return {
    ...base, fullName: app.applicantName, fatherName: app.fatherName, dob: app.dob, gender: app.gender, address: app.address,
    previousSchool: app.previousSchool, section: cls?.section ?? "",
    guardian: { ...base.guardian, name: app.fatherName, phone: app.guardianPhone, address: app.address },
  };
}
