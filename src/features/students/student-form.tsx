"use client";
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/feedback";
import { Field, FormGrid, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { useActor } from "@/lib/auth/auth";
import { PROGRESS_STATUSES, PROVINCES, RELATIONSHIPS, RESIDENCES, STUDENT_STATUSES, SURAHS } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { classLabel, createStudent, getClass, studentSchema, updateStudent, type StudentData, type StudentInput } from "@/lib/services/students";
import type { ClassKind } from "@/lib/types";
import { imageToDataUrl, todayISO } from "@/lib/utils";
import { useForm } from "@/lib/use-form";

/** Typical monthly fee per class kind — applied while the fee has not been edited by hand. */
const KIND_FEE: Record<ClassKind, number> = { qaida: 1000, nazra: 1200, hifz: 1500, nizami: 1800, general: 1500 };

export function StudentForm({ initial, studentId, applicationId }: { initial: StudentInput; studentId?: string; applicationId?: string }) {
  const { t } = useI18n();
  const db = useDb();
  const actor = useActor();
  const toast = useToast();
  const router = useRouter();
  const f = useForm<StudentInput, StudentData>(studentSchema, initial);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = !!studentId;
  const hifzOn = f.get("hifz.status") !== "Not Started";
  const photo = String(f.get("photo") ?? "");

  const onClass = (id: string) => {
    const c = getClass(db, id);
    const prev = getClass(db, String(f.get("classId") ?? ""));
    const fee = Number(f.get("monthlyFee") || 0);
    const untouched = !fee || fee === db.settings.defaultMonthlyFee || (!!prev && fee === KIND_FEE[prev.kind]);
    f.set("classId", id);
    f.set("section", c?.section ?? "");
    if (c && untouched && !editing) f.set("monthlyFee", KIND_FEE[c.kind]);
  };

  const onHifzStatus = (v: string) => {
    f.set("hifz.status", v);
    if (v !== "Not Started" && !f.get("hifz.startDate")) f.set("hifz.startDate", todayISO());
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try { f.set("photo", await imageToDataUrl(file)); } catch { toast.error(t("This file is not a valid image")); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = f.validate();
    if (!data) {
      toast.error(t("Please fix the highlighted fields"));
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
      return;
    }
    setBusy(true);
    try {
      if (studentId) {
        updateStudent(studentId, data, actor);
        toast.success(t("Student record updated"));
        router.push(`/students/${studentId}`);
      } else {
        const s = createStudent(data, actor, applicationId);
        toast.success(t("Student {name} added", { name: s.fullName }));
        router.push(`/students/${s.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? t(err.message) : t("Something went wrong. Please try again."));
      setBusy(false);
    }
  };

  const text = (path: string, label: string, opts: { required?: boolean; type?: string; hint?: string; dir?: "ltr"; placeholder?: string; disabled?: boolean } = {}) => (
    <Field label={t(label)} required={opts.required} error={f.error(path)} hint={opts.hint ? t(opts.hint) : undefined}>
      <Input {...f.field(path)} type={opts.type ?? "text"} dir={opts.dir} placeholder={opts.placeholder} disabled={opts.disabled} />
    </Field>
  );
  const select = (path: string, label: string, options: { value: string; label: string }[], opts: { required?: boolean; onChange?: (v: string) => void } = {}) => (
    <Field label={t(label)} required={opts.required} error={f.error(path)}>
      <Select {...f.field(path)} onChange={(e) => (opts.onChange ? opts.onChange(e.target.value) : f.set(path, e.target.value))}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Field>
  );
  const tr = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: t(x) }));

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardBody className="space-y-6">
          <FormSection title="Personal Information">
            <div className="mb-4 flex items-center gap-4">
              <Avatar name={String(f.get("fullName") || "?")} src={photo} size="xl" />
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Camera className="size-4" />{t(photo ? "Change photo" : "Upload photo")}</Button>
                {photo && <Button variant="ghost" size="sm" onClick={() => f.set("photo", "")}><Trash2 className="size-4" />{t("Remove photo")}</Button>}
                <p className="text-xs text-stone-500">{t("Optional. The photo is resized and stored securely with the record.")}</p>
              </div>
            </div>
            <FormGrid cols={3}>
              {text("id", "Student ID", { required: true, dir: "ltr", disabled: editing, hint: editing ? "The ID cannot be changed after admission" : "Generated automatically — change only if needed" })}
              {text("fullName", "Full name", { required: true })}
              {text("fatherName", "Father's name", { required: true })}
              {text("dob", "Date of birth", { required: true, type: "date" })}
              {select("gender", "Gender", tr(["Male", "Female"]), { required: true })}
              {text("bForm", "B-Form / CNIC reference", { dir: "ltr", placeholder: "35202-1234567-1", hint: "Optional" })}
              <div className="sm:col-span-2 lg:col-span-3">{text("address", "Address", { required: true })}</div>
              {text("city", "City", { required: true })}
              {select("province", "Province", tr(PROVINCES), { required: true })}
            </FormGrid>
          </FormSection>

          <FormSection title="Guardian Information">
            <FormGrid cols={3}>
              {text("guardian.name", "Guardian name", { required: true })}
              {select("guardian.relationship", "Relationship", tr(RELATIONSHIPS), { required: true })}
              {text("guardian.phone", "Phone", { required: true, type: "tel", dir: "ltr", placeholder: "0300-1234567" })}
              {text("guardian.altPhone", "Alternate phone", { type: "tel", dir: "ltr", placeholder: "0300-1234567" })}
              {text("guardian.email", "Email", { type: "email", dir: "ltr", hint: "Optional" })}
              {text("guardian.address", "Guardian address", { hint: "Leave empty if same as student" })}
            </FormGrid>
          </FormSection>

          <FormSection title="Madrasa Information">
            <FormGrid cols={3}>
              {text("admissionDate", "Admission date", { required: true, type: "date" })}
              {text("previousSchool", "Previous school / madrasa")}
              <Field label={t("Class")} required error={f.error("classId")}>
                <Select {...f.field("classId")} onChange={(e) => onClass(e.target.value)}>
                  <option value="">{t("Select…")}</option>
                  {db.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)} ({t(c.gender)})</option>)}
                </Select>
              </Field>
              {text("section", "Section")}
              {select("status", "Student status", tr(STUDENT_STATUSES))}
              {select("residence", "Hostel / Day scholar", tr(RESIDENCES))}
              {text("monthlyFee", "Monthly fee (Rs)", { type: "number", required: true })}
              {text("discount", "Scholarship / discount (Rs per month)", { type: "number", hint: "Deducted from the monthly fee" })}
            </FormGrid>
          </FormSection>

          <FormSection title="Religious Education">
            <FormGrid cols={3}>
              {select("nazraStatus", "Nazra status", tr(PROGRESS_STATUSES))}
              {select("hifz.status", "Hifz status", tr(PROGRESS_STATUSES), { onChange: onHifzStatus })}
              {hifzOn && text("hifz.startDate", "Hifz start date", { type: "date" })}
              {hifzOn && text("hifz.currentPara", "Current Para", { type: "number", hint: "1 to 30" })}
              {hifzOn && (
                <Field label={t("Current Surah")} error={f.error("hifz.currentSurah")}>
                  <Select {...f.field("hifz.currentSurah")} onChange={(e) => f.set("hifz.currentSurah", e.target.value)}>
                    <option value="">{t("Select…")}</option>
                    {SURAHS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
              )}
              {hifzOn && text("hifz.parasCompleted", "Paras memorised", { type: "number", hint: "Fully memorised paras (0 to 30)" })}
              {hifzOn && text("hifz.dailyLesson", "Daily lesson (Sabaq)")}
              {hifzOn && text("hifz.previousLesson", "Previous lesson (Sabqi)")}
              {hifzOn && text("hifz.revision", "Revision (Manzil)")}
              {hifzOn && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label={t("Teacher remarks")} error={f.error("hifz.remarks")}>
                    <Textarea {...f.field("hifz.remarks")} onChange={(e) => f.set("hifz.remarks", e.target.value)} />
                  </Field>
                </div>
              )}
            </FormGrid>
            {hifzOn && <p className="mt-2 text-xs text-stone-500">{t("Tip: after admission, teachers update Hifz progress from the Hifz page — these fields then update automatically.")}</p>}
          </FormSection>
        </CardBody>

        <div className="sticky bottom-[4.5rem] z-10 flex justify-end gap-2 rounded-b-[var(--radius-card)] border-t border-stone-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5 lg:bottom-0">
          <Button variant="secondary" onClick={() => router.back()}>{t("Cancel")}</Button>
          <Button type="submit" loading={busy}>{t(editing ? "Save changes" : "Save student")}</Button>
        </div>
      </Card>
    </form>
  );
}
