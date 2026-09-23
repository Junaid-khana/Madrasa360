"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { decideLeave } from "@/lib/services/leave";
import type { LeaveRecord } from "@/lib/types";

/** Approve or reject a pending leave with optional remarks. Mount only while open. */
export function DecideDialog({ leave, decision, onClose }: { leave: LeaveRecord; decision: "Approved" | "Rejected"; onClose: () => void }) {
  const { t, fmtDate } = useI18n();
  const { scoped } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const [remarks, setRemarks] = useState("");
  const student = scoped.students.find((s) => s.id === leave.studentId);
  const approve = decision === "Approved";

  const submit = () => {
    try {
      decideLeave(leave.id, decision, remarks.trim(), actor);
      toast.success(t(approve ? "Leave approved" : "Leave rejected"));
      onClose();
    } catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };

  return (
    <Modal
      open onClose={onClose} size="sm" title={t(approve ? "Approve leave" : "Reject leave")}
      description={`${student?.fullName ?? leave.studentId} · ${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)}`}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button variant={approve ? "primary" : "danger"} onClick={submit}>{t(approve ? "Approve" : "Reject")}</Button></>}
    >
      <p className="mb-3 text-sm text-stone-600">{leave.reason}</p>
      <Field label={t("Remarks")} hint={t("Optional")}><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}
