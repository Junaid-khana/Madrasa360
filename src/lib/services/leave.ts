import { z } from "zod";
import { store } from "../db/store";
import type { LeaveRecord, LeaveStatus } from "../types";
import { nowISO, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";

export const leaveSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  type: z.enum(["Sick", "Family Event", "Travel", "Other"]),
  startDate: z.string().min(1, "Select the start date"),
  endDate: z.string().min(1, "Select the end date"),
  reason: z.string().trim().min(3, "Please give a short reason"),
}).refine((l) => l.endDate >= l.startDate, { path: ["endDate"], message: "End date must be on or after the start date" });

export function createLeave(input: z.output<typeof leaveSchema>, actor: Actor): LeaveRecord {
  let rec!: LeaveRecord;
  store.update((d) => {
    rec = { ...input, id: uid("lv"), status: "Pending", approvedBy: "", remarks: "", createdAt: nowISO() };
    d.leaves.push(rec);
    const s = d.students.find((x) => x.id === input.studentId);
    pushActivity(d, actor, "leave", `Leave application recorded for ${s?.fullName ?? input.studentId}`, input.studentId);
  });
  return rec;
}

export function decideLeave(id: string, status: Exclude<LeaveStatus, "Pending">, remarks: string, actor: Actor) {
  store.update((d) => {
    const l = d.leaves.find((x) => x.id === id);
    if (!l) return;
    l.status = status; l.remarks = remarks; l.approvedBy = actor.name;
    const s = d.students.find((x) => x.id === l.studentId);
    pushActivity(d, actor, "leave", `Leave ${status.toLowerCase()} for ${s?.fullName ?? l.studentId}`, l.studentId);
  });
}
