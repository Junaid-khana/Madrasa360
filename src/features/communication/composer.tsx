"use client";
import { Info, Send, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, Ltr } from "@/components/ui/misc";
import { StudentPicker } from "@/components/ui/student-picker";
import { useAuth, useActor } from "@/lib/auth/auth";
import { MESSAGE_TYPES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import {
  PLACEHOLDERS, TEMPLATES, audienceStudents, buildRecipients, sendMessage, type Audience,
} from "@/lib/services/communication";
import { classLabel } from "@/lib/services/students";
import { getSmsProvider, smsParts } from "@/lib/sms/provider";
import type { MessageType } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

type Kind = Audience["kind"];
const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "All guardians" },
  { value: "class", label: "A class" },
  { value: "gender", label: "Boys or girls" },
  { value: "fees", label: "Guardians with outstanding fees" },
  { value: "absent", label: "Absent today" },
  { value: "students", label: "Selected students" },
];

export function initialFromParams(audience: string | null): { type: MessageType; kind: Kind } {
  if (audience === "fees") return { type: "Fee Reminder", kind: "fees" };
  if (audience === "absent") return { type: "Attendance Alert", kind: "absent" };
  return { type: "SMS", kind: "all" };
}

export function Composer({ initial }: { initial: { type: MessageType; kind: Kind } }) {
  const { t, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();

  const [type, setType] = useState<MessageType>(initial.type);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [classId, setClassId] = useState(scoped.classes[0]?.id ?? "");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [picked, setPicked] = useState<string[]>([]);
  const [body, setBody] = useState(TEMPLATES[initial.type]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const audience: Audience = useMemo(() => {
    switch (kind) {
      case "class": return { kind, classId };
      case "gender": return { kind, gender };
      case "absent": return { kind, date: todayISO() };
      case "students": return { kind, ids: picked };
      default: return { kind } as Audience;
    }
  }, [kind, classId, gender, picked]);

  const students = useMemo(() => audienceStudents(scoped, audience), [scoped, audience]);
  const recipients = useMemo(() => buildRecipients(scoped, students, body), [scoped, students, body]);
  const preview = recipients[0]?.body ?? body;
  const parts = smsParts(preview);
  const provider = getSmsProvider(scoped.settings.sms.provider);
  const simulated = provider.id === "simulation";

  const changeType = (next: MessageType) => {
    // Replace the text only if the user has not edited the current template.
    if (!body.trim() || body === TEMPLATES[type]) setBody(TEMPLATES[next]);
    setType(next);
    if (next === "Fee Reminder") setKind("fees");
    if (next === "Attendance Alert") setKind("absent");
  };

  const send = async () => {
    if (!body.trim()) { setError("Write a message first"); return; }
    if (!recipients.length) { setError("There are no guardians to send this message to"); return; }
    setError("");
    const ok = await confirm({
      title: t("Send to {n} guardian(s)?", { n: recipients.length }),
      message: simulated ? "SMS gateway is in simulation mode: nothing will actually be delivered." : "The message will be sent through the configured SMS gateway.",
      confirmLabel: "Send",
    });
    if (!ok) return;
    setSending(true);
    try {
      await sendMessage({ type, audience, body }, actor);
      toast.success(t("Message sent to {n} guardian(s)", { n: recipients.length }));
      setBody(TEMPLATES[type]);
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader title={t("New message")} description={t("Choose who should receive it, then write or pick a template.")} />
        <CardBody className="space-y-4">
          {simulated ? (
            <Alert tone="info" className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0" />
              <span>{t("SMS gateway is not connected yet: messages are saved in history but not actually delivered (simulation mode).")}{" "}
                {can("settings.manage") && <Link href="/settings?tab=communication" className="font-medium underline">{t("Open communication settings")}</Link>}</span>
            </Alert>
          ) : <Alert tone="success">{t("Sending through")}: {provider.label}</Alert>}

          <Field label={t("Message type")}>
            <div className="flex flex-wrap gap-2">
              {MESSAGE_TYPES.map((m) => (
                <button key={m} type="button" onClick={() => changeType(m)} aria-pressed={m === type}
                  className={cn("rounded-full border px-3.5 py-2 text-sm font-medium", m === type ? "border-brand-700 bg-brand-800 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50")}>
                  {t(m)}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Send to")}>
              <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{t(k.label)}</option>)}
              </Select>
            </Field>
            {kind === "class" && (
              <Field label={t("Class")}>
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
                </Select>
              </Field>
            )}
            {kind === "gender" && (
              <Field label={t("Gender")}>
                <Select value={gender} onChange={(e) => setGender(e.target.value as "Male" | "Female")}>
                  <option value="Male">{t("Boys")}</option><option value="Female">{t("Girls")}</option>
                </Select>
              </Field>
            )}
          </div>

          {kind === "students" && (
            <Field label={t("Students")}>
              <StudentPicker value="" onChange={(id) => id && setPicked((p) => (p.includes(id) ? p : [...p, id]))} placeholder="Add a student…" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {picked.map((id) => {
                  const s = scoped.students.find((x) => x.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 ps-3 pe-1.5 text-xs text-brand-900">
                      {s?.fullName ?? id}
                      <button type="button" aria-label={t("Reset")} onClick={() => setPicked((p) => p.filter((x) => x !== id))} className="rounded-full p-0.5 hover:bg-brand-100"><X className="size-3.5" /></button>
                    </span>
                  );
                })}
              </div>
            </Field>
          )}

          <Field label={t("Message")} error={error}>
            <Textarea dir="auto" rows={6} value={body} onChange={(e) => { setBody(e.target.value); setError(""); }} error={!!error} placeholder={t("Type your message in English or Urdu…")} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-stone-500">{t("Insert")}:</span>
              {PLACEHOLDERS.map((p) => (
                <button key={p} type="button" onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}${p}`)} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-xs text-stone-700 hover:bg-brand-50">{p}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              <Ltr>{fmtNum(parts.length)}</Ltr> {t("characters")} · <Ltr>{fmtNum(parts.parts)}</Ltr> {t("SMS part(s)")}{parts.unicode && ` · ${t("Urdu text uses shorter parts (70 characters)")}`}
            </p>
          </Field>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title={t("Preview")} description={recipients[0] ? t("How the message looks for {name}", { name: recipients[0].name }) : undefined} />
          <CardBody>
            <div dir="auto" className="whitespace-pre-wrap rounded-2xl rounded-ss-sm bg-brand-50 px-4 py-3 text-sm text-stone-800">{preview || <span className="text-stone-400">{t("Your message will appear here")}</span>}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">{t("Guardians who will receive it")}</span>
              <Badge tone={recipients.length ? "green" : "gray"} className="text-sm">{fmtNum(recipients.length)}</Badge>
            </div>
            {students.length !== recipients.length && <p className="text-xs text-stone-500">{t("Siblings share one message when the text is not personalised.")}</p>}
            <Button size="lg" className="w-full" onClick={send} loading={sending} disabled={!recipients.length || !body.trim()}><Send className="size-4 rtl:-scale-x-100" />{t("Send")}</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
