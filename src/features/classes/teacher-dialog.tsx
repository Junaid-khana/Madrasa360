"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useActor } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { saveTeacher, teacherSchema } from "@/lib/services/classes";
import type { Teacher } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import { useForm } from "@/lib/use-form";

/** Add / edit a teacher profile. Mount only while open. */
export function TeacherDialog({ teacher, onClose }: { teacher?: Teacher; onClose: () => void }) {
  const { t } = useI18n();
  const actor = useActor();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const f = useForm(teacherSchema, {
    name: teacher?.name ?? "", gender: teacher?.gender ?? "Male", phone: teacher?.phone ?? "", email: teacher?.email ?? "",
    qualification: teacher?.qualification ?? "", specialization: teacher?.specialization ?? "", joinDate: teacher?.joinDate ?? todayISO(),
    status: teacher?.status ?? "Active",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = f.validate();
    if (!data) { toast.error(t("Please fix the highlighted fields")); return; }
    setSaving(true);
    try {
      saveTeacher(teacher?.id ?? null, data, actor);
      toast.success(t("Saved successfully"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? t(err.message) : t("Something went wrong. Please try again."));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open onClose={onClose} title={t(teacher ? "Edit teacher" : "Add teacher")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button type="submit" form="teacher-form" loading={saving}>{t("Save")}</Button></>}
    >
      <form id="teacher-form" onSubmit={submit} noValidate>
        <FormGrid>
          <Field label={t("Full name")} required error={f.error("name")} className="sm:col-span-2"><Input {...f.field("name")} /></Field>
          <Field label={t("Gender")}><Select {...f.field("gender")}><option value="Male">{t("Male")}</option><option value="Female">{t("Female")}</option></Select></Field>
          <Field label={t("Phone")} required error={f.error("phone")}><Input type="tel" placeholder="0300-1234567" {...f.field("phone")} /></Field>
          <Field label={t("Email")} error={f.error("email")}><Input type="email" {...f.field("email")} /></Field>
          <Field label={t("Joining date")} required error={f.error("joinDate")}><Input type="date" {...f.field("joinDate")} /></Field>
          <Field label={t("Qualification")}><Input {...f.field("qualification")} /></Field>
          <Field label={t("Specialization")}><Input {...f.field("specialization")} /></Field>
          <Field label={t("Status")}><Select {...f.field("status")}><option value="Active">{t("Active")}</option><option value="Inactive">{t("Inactive")}</option></Select></Field>
        </FormGrid>
      </form>
    </Modal>
  );
}
