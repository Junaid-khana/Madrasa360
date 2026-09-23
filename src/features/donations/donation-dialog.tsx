"use client";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/feedback";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useActor } from "@/lib/auth/auth";
import { DONATION_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { createDonation, donationSchema } from "@/lib/services/donations";
import { useForm } from "@/lib/use-form";
import { todayISO } from "@/lib/utils";

export function DonationDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (donationId: string) => void }) {
  if (!open) return null;
  return <DonationForm onClose={onClose} onSaved={onSaved} />;
}

function DonationForm({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const { t } = useI18n();
  const actor = useActor();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const f = useForm(donationSchema, {
    donorName: "", phone: "", amount: "", date: todayISO(), category: "General Donation", method: "Cash", purpose: "", notes: "",
  } as unknown as z.input<typeof donationSchema>);

  const save = () => {
    const data = f.validate();
    if (!data) return;
    setBusy(true);
    try {
      const d = createDonation(data, actor);
      toast.success(t("Donation recorded — receipt {no}", { no: d.receiptNo }));
      onClose();
      onSaved(d.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Something went wrong. Please try again."));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t("Add Donation")} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={save} loading={busy}>{t("Save donation")}</Button></>}>
      <FormGrid>
        <Field label={t("Donor name")} required error={f.error("donorName")}><Input autoFocus {...f.field("donorName")} /></Field>
        <Field label={t("Phone")} error={f.error("phone")}><Input type="tel" inputMode="tel" placeholder="0300-1234567" {...f.field("phone")} /></Field>
        <Field label={t("Amount")} required error={f.error("amount")}><Input type="number" inputMode="numeric" min={1} {...f.field("amount")} /></Field>
        <Field label={t("Date")} required error={f.error("date")}><Input type="date" {...f.field("date")} /></Field>
        <Field label={t("Category")}>
          <Select value={f.values.category as string} onChange={(e) => f.set("category", e.target.value)}>
            {DONATION_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </Select>
        </Field>
        <Field label={t("Payment method")}>
          <Select value={f.values.method as string} onChange={(e) => f.set("method", e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </Select>
        </Field>
        <Field label={t("Purpose")} className="sm:col-span-2"><Input {...f.field("purpose")} placeholder={t("e.g. Hostel kitchen ration")} /></Field>
        <Field label={t("Notes")} className="sm:col-span-2"><Textarea {...f.field("notes")} rows={2} /></Field>
      </FormGrid>
    </Modal>
  );
}
