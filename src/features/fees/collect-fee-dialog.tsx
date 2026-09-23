"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea, Checkbox } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { Alert, Avatar, Ltr } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { StudentPicker } from "@/components/ui/student-picker";
import { useActor, useAuth } from "@/lib/auth/auth";
import { PAYMENT_METHODS } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { collectPayment, paymentSchema } from "@/lib/services/fees";
import type { PaymentMethod } from "@/lib/types";
import { sum, todayISO } from "@/lib/utils";
import { useLedger } from "./shared";
import { ReceiptModal } from "./receipt";

interface Props { open: boolean; onClose: () => void; studentId?: string }

/** Collect Fee: pick student → tick charges → amount → save → receipt. */
export function CollectFeeDialog({ open, onClose, studentId }: Props) {
  const { can } = useAuth();
  if (!open || !can("fees.manage")) return null;
  return <CollectForm fixedStudent={studentId} onClose={onClose} />;
}

function CollectForm({ fixedStudent, onClose }: { fixedStudent?: string; onClose: () => void }) {
  const { t, fmtMoney, fmtMonth } = useI18n();
  const db = useDb();
  const ledger = useLedger();
  const actor = useActor();
  const toast = useToast();

  const [studentId, setStudentId] = useState(fixedStudent ?? "");
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [amountText, setAmountText] = useState<string | null>(null); // null = follow the ticked total
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [paidId, setPaidId] = useState<string | null>(null);

  const student = db.students.find((s) => s.id === studentId);
  const due = useMemo(
    () => ledger.filter((r) => r.record.studentId === studentId && r.balance > 0)
      .sort((a, b) => a.record.month.localeCompare(b.record.month) || a.record.createdAt.localeCompare(b.record.createdAt)),
    [ledger, studentId],
  );
  const chosen = due.filter((r) => !unchecked.has(r.record.id));
  const totalDue = sum(chosen.map((r) => r.balance));
  const amount = amountText ?? String(totalDue);

  const pickStudent = (id: string) => { setStudentId(id); setUnchecked(new Set()); setAmountText(null); setErrors({}); };
  const toggle = (id: string) => {
    setUnchecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setAmountText(null);
  };

  const save = () => {
    const parsed = paymentSchema.safeParse({ studentId, feeIds: chosen.map((r) => r.record.id), amount, method, date, note });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[String(i.path[0])] ||= i.message;
      setErrors(e);
      return;
    }
    if (parsed.data.amount > totalDue) { setErrors({ amount: "Amount is more than the balance due" }); return; }
    setBusy(true);
    try {
      const p = collectPayment(parsed.data, actor);
      toast.success(t("Payment recorded — receipt {no}", { no: p.receiptNo }));
      setPaidId(p.id);
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (paidId) return <ReceiptModal paymentId={paidId} onClose={onClose} />;

  return (
    <Modal
      open onClose={onClose} title={t("Collect Fee")} description={t("Choose the student, confirm the charges and enter the amount received.")}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button>
        <Button onClick={save} loading={busy} disabled={!studentId || due.length === 0}>{t("Save payment")}</Button>
      </>}
    >
      <div className="space-y-4">
        <Field label={t("Student")} required error={errors.studentId}>
          {fixedStudent && student ? (
            <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
              <Avatar name={student.fullName} src={student.photo} size="sm" />
              <div className="text-sm"><span className="font-medium">{student.fullName}</span> <Ltr className="text-xs text-stone-500">{student.id}</Ltr></div>
            </div>
          ) : (
            <StudentPicker value={studentId} onChange={pickStudent} autoFocus error={!!errors.studentId} />
          )}
        </Field>

        {studentId && due.length === 0 && <Alert tone="success">{t("No outstanding fees for this student.")}</Alert>}

        {due.length > 0 && (
          <>
            <Field label={t("Charges to pay")} error={errors.feeIds}>
              <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                {due.map((r) => (
                  <li key={r.record.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={!unchecked.has(r.record.id)} onChange={() => toggle(r.record.id)}
                      label={<span><span className="font-medium text-stone-800">{r.record.description}</span> <span className="text-xs text-stone-500">· {fmtMonth(r.record.month)}</span></span>}
                    />
                    <span className="shrink-0 text-sm font-medium tabular">{fmtMoney(r.balance)}</span>
                  </li>
                ))}
              </ul>
            </Field>
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
              <span className="text-brand-900">{t("Total due (selected)")}</span>
              <span className="font-semibold text-brand-900 tabular">{fmtMoney(totalDue)}</span>
            </div>

            <FormGrid>
              <Field label={t("Amount received")} required error={errors.amount}
                hint={<button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setAmountText(null)}>{t("Pay full balance")}</button>}>
                <Input type="number" inputMode="numeric" min={1} max={totalDue} value={amount} onChange={(e) => setAmountText(e.target.value)} error={!!errors.amount} />
              </Field>
              <Field label={t("Payment method")}>
                <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
                </Select>
              </Field>
              <Field label={t("Date")} required error={errors.date}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} error={!!errors.date} />
              </Field>
              <Field label={`${t("Notes")} (${t("Optional")})`}>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-10" rows={1} />
              </Field>
            </FormGrid>
          </>
        )}
      </div>
    </Modal>
  );
}
