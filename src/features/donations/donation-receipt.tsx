"use client";
import { Printer } from "lucide-react";
import { PrintSheet, SignatureLine, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Ltr } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { userName } from "@/lib/services/students";
import { ReceiptField } from "@/features/fees/receipt";
import { amountInWords } from "./amount-words";

export function DonationReceiptSheet({ donationId }: { donationId: string }) {
  const db = useDb();
  const { t, fmtDate, fmtMoney } = useI18n();
  const d = db.donations.find((x) => x.id === donationId);
  if (!d) return null;
  return (
    <PrintSheet title="Donation Receipt">
      <dl className="grid gap-x-8 sm:grid-cols-2">
        <ReceiptField label="Receipt number"><Ltr>{d.receiptNo}</Ltr></ReceiptField>
        <ReceiptField label="Date">{fmtDate(d.date)}</ReceiptField>
        <ReceiptField label="Donor name">{d.donorName}</ReceiptField>
        <ReceiptField label="Phone">{d.phone ? <Ltr>{d.phone}</Ltr> : "—"}</ReceiptField>
        <ReceiptField label="Category">{t(d.category)}</ReceiptField>
        <ReceiptField label="Payment method">{t(d.method)}</ReceiptField>
        <ReceiptField label="Purpose">{d.purpose || "—"}</ReceiptField>
        <ReceiptField label="Received by">{userName(db, d.receivedBy)}</ReceiptField>
      </dl>
      <div className="mt-5 rounded-lg border-2 border-brand-800 p-4 text-center">
        <p className="text-[11px] uppercase text-stone-600">{t("Amount received")}</p>
        <p className="text-2xl font-bold tabular">{fmtMoney(d.amount)}</p>
        <p className="mt-1 text-[11px] italic text-stone-600" dir="ltr">{amountInWords(d.amount)}</p>
      </div>
      {d.notes && <p className="mt-2 text-[11px] text-stone-600">{t("Notes")}: {d.notes}</p>}
      <p className="mt-4 text-center text-[12px]">{t("May Allah accept your donation and reward you abundantly. Jazakallah Khair.")}</p>
      <div className="mt-10 flex justify-end"><SignatureLine label="Authorised signature" /></div>
    </PrintSheet>
  );
}

export function DonationReceiptModal({ donationId, onClose }: { donationId: string; onClose: () => void }) {
  const { t } = useI18n();
  const print = usePrint();
  return (
    <Modal open onClose={onClose} size="lg" title={t("Donation Receipt")}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t("Close")}</Button>
        <Button onClick={() => print(<DonationReceiptSheet donationId={donationId} />)}><Printer className="size-4" />{t("Print")}</Button>
      </>}>
      <div className="scroll-thin overflow-x-auto rounded-lg border border-stone-200 p-4"><DonationReceiptSheet donationId={donationId} /></div>
    </Modal>
  );
}
