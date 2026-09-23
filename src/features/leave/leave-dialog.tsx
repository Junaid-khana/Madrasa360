"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { StudentPicker } from "@/components/ui/student-picker";
import { useActor } from "@/lib/auth/auth";
import { LEAVE_TYPES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { createLeave, leaveSchema } from "@/lib/services/leave";
import { todayISO } from "@/lib/utils";
import { useForm } from "@/lib/use-form";

function LeaveForm({ onClose, studentId }: { onClose: () => void; studentId?: string }) {
  const { t } = useI18n();
  const actor = useActor();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const f = useForm(leaveSchema, { studentId: studentId ?? "", type: "Sick" as const, startDate: todayISO(), endDate: todayISO(), reason: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = f.validate();
    if (!data) { toast.error(t("Please fix the highlighted fields")); return; }
    setSaving(true);
    try {
      createLeave(data, actor);
      toast.success(t("Leave application recorded"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? t(err.message) : t("Something went wrong. Please try again."));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open onClose={onClose} title={t("New leave")} description={t("The application will be marked Pending until approved.")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button type="submit" form="leave-form" loading={saving}>{t("Save")}</Button></>}
    >
      <form id="leave-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t("Student")} required error={f.error("studentId")}>
          <StudentPicker value={String(f.values.studentId ?? "")} onChange={(id) => f.set("studentId", id)} error={!!f.error("studentId")} autoFocus={!studentId} />
        </Field>
        <FormGrid>
          <Field label={t("Leave type")}><Select {...f.field("type")}>{LEAVE_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}</Select></Field>
          <span className="hidden sm:block" />
          <Field label={t("Start date")} required error={f.error("startDate")}><Input type="date" {...f.field("startDate")} /></Field>
          <Field label={t("End date")} required error={f.error("endDate")}><Input type="date" min={String(f.values.startDate)} {...f.field("endDate")} /></Field>
        </FormGrid>
        <Field label={t("Reason")} required error={f.error("reason")}><Textarea {...f.field("reason")} placeholder={t("e.g. Fever, family wedding…")} /></Field>
      </form>
    </Modal>
  );
}

/** Record a leave application (optionally for a known student). Form state resets every time it opens. */
export function LeaveDialog({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string }) {
  return open ? <LeaveForm onClose={onClose} studentId={studentId} /> : null;
}
