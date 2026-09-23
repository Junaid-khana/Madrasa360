"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/feedback";
import { Checkbox, Field, FormGrid, Input } from "@/components/ui/form";
import { FEE_CATEGORIES } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import type { FeeCategory, FeeDiscountPreset } from "@/lib/types";
import { uid } from "@/lib/utils";
import { useSaveSettings } from "./use-save";

export function FeesTab() {
  const { t } = useI18n();
  const { settings } = useDb();
  const save = useSaveSettings();
  const toast = useToast();
  const [monthly, setMonthly] = useState(String(settings.defaultMonthlyFee));
  const [admission, setAdmission] = useState(String(settings.admissionFee));
  const [exam, setExam] = useState(String(settings.examFee));
  const [cats, setCats] = useState<FeeCategory[]>(settings.feeCategories);
  const [presets, setPresets] = useState<FeeDiscountPreset[]>(settings.discountPresets);

  const toggleCat = (c: FeeCategory) => setCats((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const patch = (id: string, p: Partial<FeeDiscountPreset>) => setPresets((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const submit = () => {
    const nums = [monthly, admission, exam].map(Number);
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) { toast.error(t("Fees must be zero or more")); return; }
    if (presets.some((p) => !p.name.trim() || p.amount < 0)) { toast.error(t("Every discount needs a name and an amount")); return; }
    save({ defaultMonthlyFee: nums[0], admissionFee: nums[1], examFee: nums[2], feeCategories: cats, discountPresets: presets.map((p) => ({ ...p, name: p.name.trim() })) }, "Fee settings updated");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("Default fees")} description={t("Used as the starting value when adding students and charging admission or exam fees.")} />
        <CardBody>
          <FormGrid cols={3}>
            <Field label={t("Default monthly fee (Rs)")}><Input type="number" min={0} value={monthly} onChange={(e) => setMonthly(e.target.value)} /></Field>
            <Field label={t("Admission fee (Rs)")}><Input type="number" min={0} value={admission} onChange={(e) => setAdmission(e.target.value)} /></Field>
            <Field label={t("Exam fee (Rs)")}><Input type="number" min={0} value={exam} onChange={(e) => setExam(e.target.value)} /></Field>
          </FormGrid>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Fee categories")} description={t("Categories available when adding a charge.")} />
        <CardBody className="flex flex-wrap gap-x-6 gap-y-3">
          {FEE_CATEGORIES.map((c) => <Checkbox key={c} label={t(c)} checked={cats.includes(c)} disabled={c === "Monthly Fee"} onChange={() => toggleCat(c)} />)}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Discounts & scholarships")} description={t("Common concessions you can apply to a student's monthly fee.")}
          action={<Button variant="secondary" size="sm" onClick={() => setPresets((l) => [...l, { id: uid("dp"), name: "", amount: 0 }])}><Plus className="size-4" />{t("Add")}</Button>} />
        <CardBody className="space-y-3">
          {presets.length === 0 && <p className="text-sm text-stone-400">{t("Nothing added yet.")}</p>}
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Input value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} placeholder={t("Discount name")} aria-label={t("Discount name")} />
              <Input type="number" min={0} value={p.amount} onChange={(e) => patch(p.id, { amount: Number(e.target.value) })} className="w-32 shrink-0" aria-label={t("Amount")} />
              <Button variant="ghost" onClick={() => setPresets((l) => l.filter((x) => x.id !== p.id))} aria-label={t("Delete")}><Trash2 className="size-4 text-red-600" /></Button>
            </div>
          ))}
        </CardBody>
      </Card>
      <div className="flex justify-end"><Button onClick={submit}>{t("Save changes")}</Button></div>
    </div>
  );
}
