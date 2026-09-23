"use client";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/feedback";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Ltr } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { StudentPicker } from "@/components/ui/student-picker";
import { Segmented } from "@/components/ui/tabs";
import { useActor, useAuth } from "@/lib/auth/auth";
import { HIFZ_QUALITIES, PARA_SURAH, SURAHS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { addHifzRecord, hifzSchema, studentHifz, type HifzInput } from "@/lib/services/hifz";
import { classLabel, getClass, getStudent } from "@/lib/services/students";
import type { Db, HifzQuality } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import { useForm } from "@/lib/use-form";

/** Starting values: the student's current para/surah, last sabaq as today's sabqi, and the next ayah. */
function initialFor(db: Db, studentId: string, userTeacherId?: string): HifzInput {
  const s = getStudent(db, studentId);
  const cls = s ? getClass(db, s.classId) : undefined;
  const para = s?.hifz.currentPara ?? 1;
  const last = s ? studentHifz(db, s.id)[0] : undefined;
  return {
    studentId, date: todayISO(), para, surah: s?.hifz.currentSurah || PARA_SURAH[para - 1],
    ayahFrom: last && last.para === para ? last.ayahTo + 1 : "", ayahTo: "",
    sabaq: "", sabqi: s?.hifz.dailyLesson ?? "", manzil: s?.hifz.revision ?? "",
    mistakes: 0, quality: "Good", assessment: "", teacherId: userTeacherId || cls?.teacherId || "", paraCompleted: false,
  };
}

/** Quick Hifz entry: Student → Sabaq / Sabqi / Manzil → Save. */
export function HifzEntryDialog({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string }) {
  const { t } = useI18n();
  const { scoped, user } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const f = useForm(hifzSchema, initialFor(scoped, studentId ?? "", user?.teacherId));
  const { setValues, setErrors } = f;

  useEffect(() => {
    if (!open) return;
    setValues(initialFor(scoped, studentId ?? "", user?.teacherId));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  const students = useMemo(() => {
    const list = scoped.students.filter((s) => s.status === "Active" && s.hifz.status !== "Not Started");
    const fixed = studentId ? scoped.students.find((s) => s.id === studentId) : undefined;
    return fixed && !list.includes(fixed) ? [fixed, ...list] : list;
  }, [scoped.students, studentId]);

  const sid = String(f.get("studentId") ?? "");
  const student = getStudent(scoped, sid);
  const mistakes = Number(f.get("mistakes")) || 0;

  const pickStudent = (id: string) => { setValues(initialFor(scoped, id, user?.teacherId)); setErrors({}); };
  const pickPara = (v: string) => { f.set("para", v); const n = Number(v); if (n >= 1 && n <= 30) f.set("surah", PARA_SURAH[n - 1]); };

  const save = () => {
    const data = f.validate();
    if (!data) { toast.error(t("Please fix the highlighted fields")); return; }
    try {
      addHifzRecord(data, actor);
      toast.success(t("Hifz progress saved"));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} size="md" title={t("Record Hifz Progress")}
      description={student ? `${student.fullName} · ${classLabel(getClass(scoped, student.classId))}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={save} disabled={!sid}>{t("Save")}</Button></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        {studentId && student
          ? <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm"><span className="font-medium">{student.fullName}</span> <Ltr className="text-stone-500">{student.id}</Ltr></p>
          : <Field label={t("Student")} required error={f.error("studentId")}>
              <StudentPicker value={sid} onChange={pickStudent} students={students} error={!!f.error("studentId")} autoFocus />
            </Field>}

        <FormGrid cols={3}>
          <Field label={t("Date")} required error={f.error("date")}><Input type="date" {...f.field("date")} /></Field>
          <Field label={t("Para")} required error={f.error("para")}>
            <Select value={String(f.get("para") ?? "")} onChange={(e) => pickPara(e.target.value)} error={!!f.error("para")}>
              {Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{t("Para")} {i + 1}</option>)}
            </Select>
          </Field>
          <Field label={t("Surah")} required error={f.error("surah")}>
            <Select {...f.field("surah")}>
              <option value="">{t("Select…")}</option>
              {SURAHS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label={t("Ayah from")} required error={f.error("ayahFrom")}><Input type="number" inputMode="numeric" min={1} {...f.field("ayahFrom")} /></Field>
          <Field label={t("Ayah to")} required error={f.error("ayahTo")}><Input type="number" inputMode="numeric" min={1} {...f.field("ayahTo")} /></Field>
        </FormGrid>

        <Field label={t("New lesson (Sabaq)")} required error={f.error("sabaq")}><Input placeholder={t("e.g. Al-Baqarah 12–18")} {...f.field("sabaq")} /></Field>
        <FormGrid>
          <Field label={t("Previous lesson (Sabqi)")}><Input {...f.field("sabqi")} /></Field>
          <Field label={t("Revision (Manzil)")}><Input placeholder={t("e.g. Para 3 – 5")} {...f.field("manzil")} /></Field>
        </FormGrid>

        <FormGrid>
          <Field label={t("Mistakes")}>
            <div className="flex items-center gap-2">
              <Button variant="secondary" aria-label="-" onClick={() => f.set("mistakes", Math.max(0, mistakes - 1))}><Minus className="size-4" /></Button>
              <span className="tabular w-10 text-center text-lg font-semibold">{mistakes}</span>
              <Button variant="secondary" aria-label="+" onClick={() => f.set("mistakes", mistakes + 1)}><Plus className="size-4" /></Button>
            </div>
          </Field>
          <Field label={t("Memorisation quality")}>
            <Segmented<HifzQuality>
              className="w-full [&>button]:flex-1" value={f.get("quality") as HifzQuality}
              options={HIFZ_QUALITIES.map((q) => ({ value: q, label: q }))} onChange={(v) => f.set("quality", v)}
            />
          </Field>
        </FormGrid>

        <Field label={t("Teacher assessment")}><Textarea rows={2} {...f.field("assessment")} /></Field>
        <FormGrid>
          <Field label={t("Teacher")}>
            <Select {...f.field("teacherId")}>
              <option value="">{t("Select…")}</option>
              {scoped.teachers.filter((x) => x.status === "Active").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox label={t("Para completed")} checked={f.get("paraCompleted") === true} onChange={(e) => f.set("paraCompleted", e.target.checked)} />
          </div>
        </FormGrid>
      </form>
    </Modal>
  );
}
