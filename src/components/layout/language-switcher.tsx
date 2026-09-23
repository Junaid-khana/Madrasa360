"use client";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className, light }: { className?: string; light?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg border p-0.5 text-sm", light ? "border-white/30" : "border-stone-300 bg-white", className)} role="group" aria-label={t("Language")}>
      <Languages className={cn("mx-1.5 size-4", light ? "text-white/80" : "text-stone-400")} aria-hidden />
      {(["en", "ur"] as const).map((l) => (
        <button
          key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} lang={l}
          className={cn("rounded-md px-2.5 py-1 font-medium transition-colors",
            lang === l ? (light ? "bg-white text-brand-900" : "bg-brand-800 text-white") : light ? "text-white/80 hover:text-white" : "text-stone-600 hover:bg-stone-100")}
        >
          {l === "en" ? "English" : "اردو"}
        </button>
      ))}
    </div>
  );
}
