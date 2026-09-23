"use client";
import { Printer } from "lucide-react";
import type { ReactNode } from "react";
import { PrintSheet, PrintTable, SignatureLine, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Ltr } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { receiptView } from "@/lib/services/fees";
import { classLabel, getClass } from "@/lib/services/students";

export function ReceiptField({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2 border-b border-dotted border-stone-300 py-1">
      <dt className="w-32 shrink-0 text-stone-600">{t(label)}</dt>
      <dd className="min-w-0 flex-1 font-medium">{children}</dd>
    </div>
  );
}

/** Printable fee receipt. Also used inside ReceiptModal as the on-screen preview. */
export function ReceiptSheet({ paymentId }: { paymentId: string }) {
  const db = useDb();
  const { t, fmtDate, fmtMoney, fmtMonth } = useI18n();
  const v = receiptView(db, paymentId);
  if (!v) return null;
  const { payment, student, lines } = v;
  const months = Array.from(new Set(lines.map((l) => l.fee.month))).sort().map(fmtMonth).join(", ");
  const money = (n: number) => <span className="block text-end tabular">{fmtMoney(n)}</span>;

  return (
    <PrintSheet title="Fee Receipt">
      <dl className="grid gap-x-8 sm:grid-cols-2">
        <ReceiptField label="Receipt number"><Ltr>{payment.receiptNo}</Ltr></ReceiptField>
        <ReceiptField label="Date">{fmtDate(payment.date)}</ReceiptField>
        <ReceiptField label="Student name">{student?.fullName ?? payment.studentId}</ReceiptField>
        <ReceiptField label="Student ID"><Ltr>{payment.studentId}</Ltr></ReceiptField>
        <ReceiptField label="Class">{student ? classLabel(getClass(db, student.classId)) : "—"}</ReceiptField>
        <ReceiptField label="Fee month">{months}</ReceiptField>
      </dl>

      <PrintTable
        className="mt-4"
        headers={["Description", "Amount", "Discount", "Paid now", "Remaining"]}
        rows={lines.map((l) => [
          <span key="d">{l.fee.description} <span className="text-stone-500">({fmtMonth(l.fee.month)})</span></span>,
          money(l.fee.amount), money(l.fee.discount), money(l.paid), money(l.remaining),
        ])}
      />

      <div className="ms-auto mt-3 w-full max-w-64 space-y-1 text-[12px]">
        <div className="flex justify-between"><span>{t("Amount")}</span><span className="tabular">{fmtMoney(v.gross)}</span></div>
        <div className="flex justify-between"><span>{t("Discount")}</span><span className="tabular">{fmtMoney(v.discount)}</span></div>
        <div className="flex justify-between border-t border-black pt-1 text-sm font-bold"><span>{t("Amount paid")}</span><span className="tabular">{fmtMoney(payment.amount)}</span></div>
        <div className="flex justify-between"><span>{t("Remaining balance")}</span><span className="tabular">{fmtMoney(v.remaining)}</span></div>
      </div>

      <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <ReceiptField label="Payment method">{t(payment.method)}</ReceiptField>
        <ReceiptField label="Received by">{v.receivedBy || "—"}</ReceiptField>
      </dl>
      {payment.note && <p className="mt-2 text-[11px] text-stone-600">{t("Notes")}: {payment.note}</p>}

      <div className="mt-10 flex justify-between">
        <SignatureLine label="Guardian signature" />
        <SignatureLine label="Accountant signature" />
      </div>
    </PrintSheet>
  );
}

/** Receipt preview with a Print button. */
export function ReceiptModal({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const { t } = useI18n();
  const print = usePrint();
  return (
    <Modal
      open onClose={onClose} size="lg" title={t("Fee Receipt")}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t("Close")}</Button>
        <Button onClick={() => print(<ReceiptSheet paymentId={paymentId} />)}><Printer className="size-4" />{t("Print")}</Button>
      </>}
    >
      <div className="scroll-thin overflow-x-auto rounded-lg border border-stone-200 p-4"><ReceiptSheet paymentId={paymentId} /></div>
    </Modal>
  );
}
