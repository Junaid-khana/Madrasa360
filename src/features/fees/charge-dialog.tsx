"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/tabs";
import { StudentPicker } from "@/components/ui/student-picker";
import { useActor, useAuth } from "@/lib/auth/auth";
import { FEE_CATEGORIES } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { addCharges, chargeSchema } from "@/lib/services/fees";
import { classLabel } from "@/lib/services/students";
import { monthOf, todayISO } from "@/lib/utils";
import { useForm } from "@/lib/use-form";
import type { z } from "zod";

type Mode = "students" | "class";

export function ChargeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { can } = useAuth();
  if (!open || !can("fees.manage")) return null;
  return <ChargeForm onClose={onClose} />;
}

function ChargeForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const db = useDb();
  const actor = useActor();
  const toast = useToast();
  const f = useForm(chargeSchema, { studentIds: [], month: monthOf(todayISO()), category: "Other", description: "", amount: "", discount: "0" } as unknown as z.input<typeof chargeSchema>);
  const [mode, setMode] = useState<Mode>("students");
  const [classId, setClassId] = useState("");
  const [pick, setPick] = useState("");

  const ids = f.values.studentIds as string[];
  const changeMode = (m: Mode) => { setMode(m); f.set("studentIds", []); setClassId(""); };
  const addStudent = (id: string) => { if (id && !ids.includes(id)) f.set("studentIds", [...ids, id]); setPick(""); };
  const chooseClass = (id: string) => { setClassId(id); f.set("studentIds", db.students.filter((s) => s.classId === id && s.status === "Active").map((s) => s.id)); };

  const save = () => {
    const data = f.validate();
    if (!data) return;
    try {
      addCharges(data, actor);
      toast.success(t("Charge added for {n} student(s)", { n: data.studentIds.length }));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Something went wrong. Please try again."));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("Add charge")} description={t("Add an admission, exam or other charge to one or many students.")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={save}>{t("Save")}</Button></>}>
      <div className="space-y-4">
        <Segmented<Mode> value={mode} onChange={changeMode} options={[{ value: "students", label: "Selected students" }, { value: "class", label: "Whole class" }]} />
        {mode === "students" ? (
          <Field label={t("Students")} required error={f.error("studentIds")}>
            <StudentPicker value={pick} onChange={addStudent} error={!!f.error("studentIds")} />
            {ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ids.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 ps-3 pe-1.5 text-xs text-brand-900">
                    {db.students.find((s) => s.id === id)?.fullName ?? id}
                    <button type="button" aria-label={t("Reset")} onClick={() => f.set("studentIds", ids.filter((x) => x !== id))}><X className="size-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        ) : (
          <Field label={t("Class")} required error={f.error("studentIds")} hint={ids.length ? t("{n} student(s) will be charged", { n: ids.length }) : undefined}>
            <Select value={classId} onChange={(e) => chooseClass(e.target.value)} error={!!f.error("studentIds")}>
              <option value="">{t("Select…")}</option>
              {db.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </Select>
          </Field>
        )}
        <FormGrid>
          <Field label={t("Fee month")} required error={f.error("month")}><Input type="month" {...f.field("month")} /></Field>
          <Field label={t("Category")} required>
            <Select value={f.values.category as string} onChange={(e) => f.set("category", e.target.value)}>
              {FEE_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </Select>
          </Field>
          <Field label={t("Description")} required error={f.error("description")} className="sm:col-span-2">
            <Input {...f.field("description")} placeholder={t("e.g. Mid-Term exam fee")} />
          </Field>
          <Field label={t("Amount")} required error={f.error("amount")}><Input type="number" inputMode="numeric" min={1} {...f.field("amount")} /></Field>
          <Field label={t("Discount")} error={f.error("discount")}>
            <Input type="number" inputMode="numeric" min={0} {...f.field("discount")} />
            {db.settings.discountPresets.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {db.settings.discountPresets.map((p) => (
                  <button key={p.id} type="button" onClick={() => f.set("discount", String(p.amount))} className="rounded-full border border-stone-200 px-2.5 py-0.5 text-xs text-stone-600 hover:border-brand-400 hover:bg-brand-50">{p.name} · {p.amount}</button>
                ))}
              </div>
            )}
          </Field>
        </FormGrid>
      </div>
    </Modal>
  );
}
