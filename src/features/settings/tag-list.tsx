"use client";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n";

/** Editable list of short text items (subjects, exam types). */
export function TagList({ items, onChange, placeholder }: { items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.some((i) => i.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    onChange([...items, v]); setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={t(placeholder)} />
        <Button variant="secondary" onClick={add}><Plus className="size-4" />{t("Add")}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-1 ps-3 pe-1.5 text-sm text-stone-800">
            {i}
            <button type="button" aria-label={`${t("Delete")} ${i}`} onClick={() => onChange(items.filter((x) => x !== i))} className="rounded-full p-1 text-stone-500 hover:bg-stone-200"><X className="size-3.5" /></button>
          </span>
        ))}
        {items.length === 0 && <p className="text-sm text-stone-400">{t("Nothing added yet.")}</p>}
      </div>
    </div>
  );
}
