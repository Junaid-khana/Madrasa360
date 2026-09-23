import { store } from "../db/store";
import { getSmsProvider } from "../sms/provider";
import type { CommunicationMessage, Db, MessageRecipient, MessageType, Student } from "../types";
import { nowISO, todayISO, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";
import { buildLedger, outstandingByStudent } from "./fees";
import { classLabel, getClass } from "./students";

export type Audience =
  | { kind: "all" }
  | { kind: "class"; classId: string }
  | { kind: "gender"; gender: "Male" | "Female" }
  | { kind: "fees" }
  | { kind: "absent"; date: string }
  | { kind: "students"; ids: string[] };

export function audienceStudents(db: Db, a: Audience): Student[] {
  const active = db.students.filter((s) => s.status === "Active");
  switch (a.kind) {
    case "all": return active;
    case "class": return active.filter((s) => s.classId === a.classId);
    case "gender": return active.filter((s) => s.gender === a.gender);
    case "fees": {
      const out = outstandingByStudent(buildLedger(db));
      return active.filter((s) => out.has(s.id));
    }
    case "absent": {
      const ids = new Set<string>();
      db.attendance.filter((x) => x.date === a.date).forEach((sh) =>
        Object.entries(sh.entries).forEach(([id, m]) => { if (m === "A") ids.add(id); }));
      return active.filter((s) => ids.has(s.id));
    }
    case "students": return active.filter((s) => a.ids.includes(s.id));
  }
}

export function audienceLabel(db: Db, a: Audience): string {
  switch (a.kind) {
    case "all": return "All guardians";
    case "class": return `Class: ${classLabel(getClass(db, a.classId))}`;
    case "gender": return a.gender === "Male" ? "Boys' guardians" : "Girls' guardians";
    case "fees": return "Guardians with outstanding fees";
    case "absent": return a.date === todayISO() ? "Absent today" : `Absent on ${a.date}`;
    case "students": return a.ids.length === 1 ? "Single guardian" : `${a.ids.length} selected guardians`;
  }
}

export const TEMPLATES: Record<MessageType, string> = {
  "SMS": "",
  "Announcement": "Assalam o Alaikum. {madrasa} announcement: ",
  "Fee Reminder": "Assalam o Alaikum {guardian}, fee of Rs {amount} for {student} is pending. Please pay at the office. — {madrasa}",
  "Attendance Alert": "Assalam o Alaikum {guardian}, {student} was absent from madrasa on {date}. Kindly inform us of the reason.",
  "General Notice": "Assalam o Alaikum {guardian}. Notice from {madrasa}: ",
};

export const PLACEHOLDERS = ["{guardian}", "{student}", "{class}", "{amount}", "{date}", "{madrasa}"];

export function renderTemplate(db: Db, body: string, s: Student, outstanding: number): string {
  return body
    .replaceAll("{guardian}", s.guardian.name)
    .replaceAll("{student}", s.fullName)
    .replaceAll("{class}", classLabel(getClass(db, s.classId)))
    .replaceAll("{amount}", outstanding.toLocaleString("en-PK"))
    .replaceAll("{date}", todayISO())
    .replaceAll("{madrasa}", db.settings.madrasaName);
}

/** Build one message per guardian. If the text isn't personalised per student, siblings share one SMS. */
export function buildRecipients(db: Db, students: Student[], body: string): MessageRecipient[] {
  const out = outstandingByStudent(buildLedger(db));
  const personal = /\{(student|amount|class)\}/.test(body);
  const seen = new Set<string>();
  const list: MessageRecipient[] = [];
  for (const s of students) {
    if (!personal) {
      if (seen.has(s.guardian.phone)) continue;
      seen.add(s.guardian.phone);
    }
    list.push({ studentId: s.id, name: s.guardian.name, phone: s.guardian.phone, body: renderTemplate(db, body, s, out.get(s.id) ?? 0) });
  }
  return list;
}

export async function sendMessage(
  input: { type: MessageType; audience: Audience; body: string },
  actor: Actor,
): Promise<CommunicationMessage> {
  const db = store.db;
  const students = audienceStudents(db, input.audience);
  const recipients = buildRecipients(db, students, input.body);
  if (!recipients.length) throw new Error("There are no guardians to send this message to");
  const provider = getSmsProvider(db.settings.sms.provider);
  const results = await provider.send(recipients.map((r) => ({ to: r.phone, body: r.body, ref: r.studentId })), db.settings.sms);
  const okCount = results.filter((r) => r.ok).length;
  const msg: CommunicationMessage = {
    id: uid("m"), type: input.type, audience: audienceLabel(db, input.audience), body: input.body, recipients,
    status: okCount === 0 ? "Failed" : "Sent", provider: provider.id, sentBy: actor.name, sentAt: nowISO(),
  };
  store.update((d) => {
    d.messages.unshift(msg);
    pushActivity(d, actor, "communication", `${input.type} sent to ${recipients.length} guardian(s) — ${msg.audience}`);
  });
  if (okCount === 0) throw new Error(results[0]?.error ?? "Message could not be sent");
  return msg;
}
