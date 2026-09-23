"use client";
import { CheckCircle2, ChevronRight, Info, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Alert, Avatar, EmptyState, Ltr } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { useActor, useAuth } from "@/lib/auth/auth";
import { SESSIONS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { classRoster, dayAttendance, findSheet, hasApprovedLeave, saveAttendance } from "@/lib/services/attendance";
import { classLabel, getClass, userName } from "@/lib/services/students";
import type { AttendanceMark } from "@/lib/types";
import { pct, todayISO } from "@/lib/utils";
import { MarkButtons, type Selection } from "./shared";

type Marks = Record<string, AttendanceMark | undefined>;

export function MarkTab({ sel, onSel, onDirty }: { sel: Selection; onSel: (s: Selection) => void; onDirty: (d: boolean) => void }) {
  const { t, fmtDateTime, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const canMark = can("attendance.mark");
  const today = todayISO();

  const cls = getClass(scoped, sel.classId);
  const roster = useMemo(
    () => classRoster(scoped, sel.classId, sel.date).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [scoped, sel.classId, sel.date],
  );
  const sheet = findSheet(scoped, sel.date, sel.classId, sel.session);

  // Saved marks, or an "on leave" suggestion for students with approved leave on that date.
  const initial = useMemo<Marks>(() => {
    const m: Marks = {};
    for (const s of roster) m[s.id] = sheet?.entries[s.id] ?? (hasApprovedLeave(scoped, s.id, sel.date) ? "L" : undefined);
    return m;
  }, [roster, sheet, scoped, sel.date]);

  const key = `${sel.date}|${sel.classId}|${sel.session}|${sheet?.updatedAt ?? ""}`;
  const [state, setState] = useState<{ key: string; marks: Marks }>({ key, marks: initial });
  if (state.key !== key) setState({ key, marks: initial });
  const marks = state.key === key ? state.marks : initial;
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState("");

  const dirty = roster.some((s) => marks[s.id] !== initial[s.id]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);

  const counts = { P: 0, A: 0, L: 0, none: 0 };
  for (const s of roster) { const m = marks[s.id]; if (m) counts[m]++; else counts.none++; }
  const marked = counts.P + counts.A + counts.L;

  const setMark = (id: string, m: AttendanceMark) => setState({ key, marks: { ...marks, [id]: m } });
  const markAllPresent = () => setState({ key, marks: Object.fromEntries(roster.map((s) => [s.id, "P" as const])) });

  const change = async (patch: Partial<Selection>) => {
    if (dirty && !(await confirm({
      title: "Discard unsaved changes?", message: "You have attendance changes that are not saved. Switching will discard them.",
      confirmLabel: "Discard", tone: "danger",
    }))) return;
    onSel({ ...sel, ...patch });
  };

  const save = async () => {
    const final: Marks = { ...marks };
    if (counts.none > 0) {
      const ok = await confirm({
        title: "Some students are not marked",
        message: t("Mark the remaining {n} student(s) as Present?", { n: counts.none }),
        confirmLabel: "Yes, mark present",
      });
      if (!ok) return;
      for (const s of roster) final[s.id] ||= "P";
    }
    const entries: Record<string, AttendanceMark> = { ...(sheet?.entries ?? {}) };
    for (const s of roster) entries[s.id] = final[s.id]!;
    setSaving(true);
    try {
      saveAttendance({ date: sel.date, classId: sel.classId, session: sel.session, entries }, actor);
      toast.success(t("Attendance saved for {class}", { class: classLabel(cls) }));
      setSavedKey(key);
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    } finally { setSaving(false); }
  };

  const pendingIds = sel.date === today ? dayAttendance(scoped, today).pendingClasses.filter((id) => id !== sel.classId) : [];
  const nextPending = getClass(scoped, pendingIds[0] ?? "");
  const justSaved = savedKey !== "" && savedKey.startsWith(`${sel.date}|${sel.classId}|${sel.session}|`);

  if (!scoped.classes.length) return <EmptyState title="No classes available" description="You have not been assigned to any class yet." />;

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[1fr_1.4fr_auto]">
        <Field label={t("Date")}>
          <Input type="date" value={sel.date} max={today} onChange={(e) => e.target.value && change({ date: e.target.value > today ? today : e.target.value })} />
        </Field>
        <Field label={t("Class")}>
          <Select value={sel.classId} onChange={(e) => change({ classId: e.target.value })}>
            {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
          </Select>
        </Field>
        <Field label={t("Session")} className="sm:col-span-2 lg:col-span-1">
          <Segmented className="w-full [&>button]:flex-1" options={SESSIONS.map((s) => ({ value: s, label: s }))} value={sel.session} onChange={(v) => change({ session: v })} />
        </Field>
      </Card>

      {!canMark && <Alert tone="info"><Lock className="me-1.5 inline size-4" />{t("You can view attendance but not change it.")}</Alert>}
      {sheet && (
        <Alert tone="warn">
          <Info className="me-1.5 inline size-4" />
          {t("Editing saved attendance — last saved by {name} at {time}", { name: userName(scoped, sheet.markedBy), time: fmtDateTime(sheet.updatedAt) })}
        </Alert>
      )}
      {justSaved && nextPending && (
        <Alert tone="success" className="flex flex-wrap items-center justify-between gap-2">
          <span><CheckCircle2 className="me-1.5 inline size-4" />{t("Saved. Next pending class:")} <strong>{classLabel(nextPending)}</strong></span>
          <Button size="sm" variant="soft" onClick={() => change({ classId: nextPending.id })}>{t("Mark next class")}<ChevronRight className="size-4 rtl:rotate-180" /></Button>
        </Alert>
      )}
      {justSaved && !nextPending && sel.date === today && <Alert tone="success"><CheckCircle2 className="me-1.5 inline size-4" />{t("Saved. Attendance is complete for all classes today.")}</Alert>}

      {roster.length === 0 ? (
        <Card><EmptyState title="No students in this class" description="Assign students to this class first." action={<Link className="text-sm font-medium text-brand-700 hover:underline" href={`/classes/${sel.classId}`}>{t("Open class")}</Link>} /></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="green" label="Present" n={counts.P} /><Chip tone="red" label="Absent" n={counts.A} /><Chip tone="blue" label="Leave" n={counts.L} />
            <Chip tone="gray" label="Not marked" n={counts.none} />
            <span className="ms-1 text-sm text-stone-600">{t("Attendance")}: <strong className="tabular">{fmtNum(pct(counts.P, marked))}%</strong></span>
            {canMark && <Button variant="secondary" className="ms-auto" onClick={markAllPresent}><CheckCircle2 className="size-4" />{t("Mark all present")}</Button>}
          </div>

          <Card className="divide-y divide-stone-100">
            {roster.map((s, i) => (
              <div key={s.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-xs text-stone-400 tabular">{fmtNum(i + 1)}</span>
                  <Avatar name={s.fullName} src={s.photo} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">{s.fullName}</p>
                    <p className="text-xs text-stone-500"><Ltr>{s.id}</Ltr> · {t(s.gender)}{marks[s.id] === "L" && hasApprovedLeave(scoped, s.id, sel.date) ? ` · ${t("Approved leave")}` : ""}</p>
                  </div>
                </div>
                <div className="sm:w-80"><MarkButtons value={marks[s.id]} onChange={(m) => setMark(s.id, m)} disabled={!canMark} /></div>
              </div>
            ))}
          </Card>

          {canMark && (
            <div className="no-print sticky bottom-[4.75rem] z-20 lg:bottom-4">
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
                <p className="flex-1 text-xs text-stone-600 sm:text-sm tabular">
                  <span className="text-brand-700">{t("Present")} {fmtNum(counts.P)}</span> · <span className="text-red-600">{t("Absent")} {fmtNum(counts.A)}</span> · <span className="text-sky-600">{t("Leave")} {fmtNum(counts.L)}</span>
                  {counts.none > 0 && <> · <span className="text-stone-500">{t("Not marked")} {fmtNum(counts.none)}</span></>}
                </p>
                <Button size="lg" onClick={save} loading={saving} disabled={!dirty && !!sheet}>{sheet ? t("Update attendance") : t("Save attendance")}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ tone, label, n }: { tone: "green" | "red" | "blue" | "gray"; label: string; n: number }) {
  const { t, fmtNum } = useI18n();
  const c = { green: "bg-brand-50 text-brand-800", red: "bg-red-50 text-red-700", blue: "bg-sky-50 text-sky-800", gray: "bg-stone-100 text-stone-700" }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${c}`}>{t(label)} <strong className="tabular">{fmtNum(n)}</strong></span>;
}
