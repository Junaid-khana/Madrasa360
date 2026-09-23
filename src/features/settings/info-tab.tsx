"use client";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/feedback";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { useForm } from "@/lib/use-form";
import { imageToDataUrl } from "@/lib/utils";
import { useSaveSettings } from "./use-save";

const schema = z.object({
  madrasaName: z.string().trim().min(2, "Enter the madrasa name"),
  madrasaNameUr: z.string().trim().default(""),
  address: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  email: z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email").default(""),
  website: z.string().trim().default(""),
  principal: z.string().trim().default(""),
});

export function InfoTab() {
  const { t } = useI18n();
  const { settings } = useDb();
  const save = useSaveSettings();
  const toast = useToast();
  const f = useForm(schema, { madrasaName: settings.madrasaName, madrasaNameUr: settings.madrasaNameUr, address: settings.address, phone: settings.phone, email: settings.email, website: settings.website, principal: settings.principal });
  const [logo, setLogo] = useState(settings.logo);
  const file = useRef<HTMLInputElement>(null);

  const pick = async (fl?: File) => {
    if (!fl) return;
    try { setLogo(await imageToDataUrl(fl, 200)); } catch (e) { toast.error(e instanceof Error ? e.message : t("Something went wrong. Please try again.")); }
  };
  const submit = () => {
    const data = f.validate();
    if (!data) { toast.error(t("Please fix the highlighted fields")); return; }
    save({ ...data, logo }, "Madrasa information updated");
  };

  return (
    <Card>
      <CardHeader title={t("Madrasa Information")} description={t("Shown on the login page, receipts and printed reports.")} />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          {logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" className="size-20 rounded-xl border border-stone-200 bg-white object-contain" /> : <Logo className="size-20" />}
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-800">{t("Logo")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => file.current?.click()}><ImagePlus className="size-4" />{t("Upload logo")}</Button>
              {logo && <Button variant="ghost" size="sm" onClick={() => setLogo("")}><Trash2 className="size-4" />{t("Remove")}</Button>}
            </div>
            <p className="text-xs text-stone-500">{t("PNG or JPG, square image works best.")}</p>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        <FormGrid>
          <Field label={t("Madrasa name")} required error={f.error("madrasaName")}><Input {...f.field("madrasaName")} /></Field>
          <Field label={t("Madrasa name (Urdu)")}><Input dir="rtl" {...f.field("madrasaNameUr")} /></Field>
          <Field label={t("Principal / administrator")}><Input {...f.field("principal")} /></Field>
          <Field label={t("Phone")}><Input type="tel" {...f.field("phone")} /></Field>
          <Field label={t("Email")} error={f.error("email")}><Input type="email" {...f.field("email")} /></Field>
          <Field label={t("Website")}><Input dir="ltr" {...f.field("website")} /></Field>
          <Field label={t("Address")} className="sm:col-span-2"><Input {...f.field("address")} /></Field>
        </FormGrid>
        <div className="flex justify-end"><Button onClick={submit}>{t("Save changes")}</Button></div>
      </CardBody>
    </Card>
  );
}
