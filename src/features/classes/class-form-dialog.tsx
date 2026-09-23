"use client";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, FormSection, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useActor, useAuth } from "@/lib/auth/auth";
import { WEEK_DAYS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { classSchema, saveClass, type ClassData } from "@/lib/services/classes";
import type { ClassKind, ClassRoom } from "@/lib/types";
import { useForm } from "@/lib/use-form";

export const KIND_LABEL: Record<ClassKind, string> = {
  qaida: "Qaida", nazra: "Nazra", hifz: "Hifz", nizami: "Dars-e-Nizami", general: "General Studies",
};
const NAME_SUGGESTIONS = ["Qaida", "Nazra", "Hifz 1", "Hifz 2", "Hifz 3", "Dars-e-Nizami Basic", "General Studies"];

/** Add / edit a class: details, subjects (chips) and weekly timetable. Mount only while open. */
export function ClassFormDialog({ cls, onClose }: { cls?: ClassRoom; onClose: () => void }) {
  const { t } = useI18n();
  const { scoped } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const [customSubject, setCustomSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const f = useForm(classSchema, {
    name: cls?.name ?? "", section: cls?.section ?? "", kind: cls?.kind ?? "hifz", teacherId: cls?.teacherId ?? "",
    room: cls?.room ?? "", gender: cls?.gender ?? "Male", subjects: cls?.subjects ?? [], timetable: cls?.timetable ?? [],
  });
  const subjects = f.values.subjects ?? [];
  const timetable = f.values.timetable ?? [];

  const addSubject = (s: string) => {
    const v = s.trim();
    if (v && !subjects.includes(v)) f.set("subjects", [...subjects, v]);
  };
  const setSlot = (i: number, key: "day" | "time" | "subject", value: string) =>
    f.set("timetable", timetable.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ClassData | null = f.validate();
    if (!data) { toast.error(t("Please fix the highlighted fields")); return; }
    setSaving(true);
    try {
      saveClass(cls?.id ?? null, data, actor);
      toast.success(t("Saved successfully"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? t(err.message) : t("Something went wrong. Please try again."));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open onClose={onClose} size="lg" title={t(cls ? "Edit class" : "Add class")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button type="submit" form="class-form" loading={saving}>{t("Save")}</Button></>}
    >
      <form id="class-form" onSubmit={submit} className="space-y-6" noValidate>
        <FormSection title="Class details">
          <FormGrid cols={3}>
            <Field label={t("Class name")} required error={f.error("name")}>
              <Input list="class-names" {...f.field("name")} />
              <datalist id="class-names">{NAME_SUGGESTIONS.map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field label={t("Section")} error={f.error("section")}><Input {...f.field("section")} placeholder="A" /></Field>
            <Field label={t("Class type")} error={f.error("kind")}>
              <Select {...f.field("kind")}>{(Object.keys(KIND_LABEL) as ClassKind[]).map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}</Select>
            </Field>
            <Field label={t("Teacher")} required error={f.error("teacherId")}>
              <Select {...f.field("teacherId")}>
                <option value="">{t("Select…")}</option>
                {scoped.teachers.filter((x) => x.status === "Active" || x.id === cls?.teacherId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            </Field>
            <Field label={t("Room")}><Input {...f.field("room")} /></Field>
            <Field label={t("Gender")}>
              <Select {...f.field("gender")}><option value="Male">{t("Male")}</option><option value="Female">{t("Female")}</option><option value="Mixed">{t("Mixed")}</option></Select>
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Subjects">
          <div className="mb-3 flex flex-wrap gap-2">
            {subjects.length === 0 && <p className="text-sm text-stone-500">{t("No subjects added yet.")}</p>}
            {subjects.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pe-1.5 ps-3 text-sm text-brand-800">
                {s}<button type="button" aria-label={t("Delete")} onClick={() => f.set("subjects", subjects.filter((x) => x !== s))} className="rounded-full p-0.5 hover:bg-brand-100"><X className="size-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value="" onChange={(e) => addSubject(e.target.value)} className="w-auto min-w-48" aria-label={t("Add subject")}>
              <option value="">{t("Add subject…")}</option>
              {scoped.settings.subjects.filter((s) => !subjects.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder={t("Other subject")} className="w-auto min-w-40"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(customSubject); setCustomSubject(""); } }} />
            <Button variant="secondary" onClick={() => { addSubject(customSubject); setCustomSubject(""); }} disabled={!customSubject.trim()}><Plus className="size-4" />{t("Add")}</Button>
          </div>
        </FormSection>

        <FormSection title="Timetable" description="Weekly lessons. Leave empty if not needed.">
          <div className="space-y-2">
            {timetable.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[9rem_10rem_1fr_auto]">
                <Select value={r.day} onChange={(e) => setSlot(i, "day", e.target.value)} aria-label={t("Day")}>{WEEK_DAYS.map((d) => <option key={d} value={d}>{t(d)}</option>)}</Select>
                <Input value={r.time} onChange={(e) => setSlot(i, "time", e.target.value)} placeholder="08:00 - 09:00" aria-label={t("Time")} dir="ltr" />
                <Select value={r.subject} onChange={(e) => setSlot(i, "subject", e.target.value)} className="col-span-2 sm:col-span-1" aria-label={t("Subject")}>
                  <option value="">{t("Select…")}</option>
                  {Array.from(new Set([...subjects, r.subject].filter(Boolean))).map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <button type="button" onClick={() => f.set("timetable", timetable.filter((_, j) => j !== i))} aria-label={t("Delete")} className="row-start-1 col-start-3 justify-self-end rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 sm:row-start-auto sm:col-start-auto"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => f.set("timetable", [...timetable, { day: WEEK_DAYS[0], time: "", subject: subjects[0] ?? "" }])}><Plus className="size-4" />{t("Add lesson")}</Button>
          </div>
        </FormSection>
      </form>
    </Modal>
  );
}
