"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { generateMonthlyFees } from "@/lib/services/fees";
import { monthOf, todayISO } from "@/lib/utils";

export function GenerateFeesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { can } = useAuth();
  if (!open || !can("fees.manage")) return null;
  return <GenerateForm onClose={onClose} />;
}

function GenerateForm({ onClose }: { onClose: () => void }) {
  const { t, fmtMonth } = useI18n();
  const db = useDb();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const [month, setMonth] = useState(monthOf(todayISO()));

  // same rule as the service: active students admitted by that month without a monthly charge yet
  const pending = useMemo(() => db.students.filter((s) => s.status === "Active" && s.admissionDate.slice(0, 7) <= month &&
    !db.fees.some((f) => f.studentId === s.id && f.month === month && f.category === "Monthly Fee")).length, [db, month]);

  const run = async () => {
    if (!month) return;
    const ok = await confirm({ title: "Generate monthly fees?", message: t("Monthly fee for {month} will be created for {n} student(s).", { month: fmtMonth(month), n: pending }), confirmLabel: "Generate" });
    if (!ok) return;
    try {
      const n = generateMonthlyFees(month, actor);
      toast.success(t("{n} monthly fee charge(s) created", { n }));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Something went wrong. Please try again."));
    }
  };

  return (
    <Modal open onClose={onClose} size="sm" title={t("Generate monthly fees")} description={t("Creates the monthly charge for every active student who does not have one yet.")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={run} disabled={!month || pending === 0}>{t("Generate")}</Button></>}>
      <div className="space-y-4">
        <Field label={t("Fee month")} required><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <Alert tone={pending ? "info" : "success"}>{pending ? t("{n} student(s) will be charged.", { n: pending }) : t("Monthly fees for this month are already generated.")}</Alert>
      </div>
    </Modal>
  );
}
