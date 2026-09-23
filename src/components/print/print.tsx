"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Printing works by rendering a document into #print-root (a body-level portal) and calling window.print().
 * globals.css hides everything else while printing, so any component can be printed — receipts, profiles,
 * result cards, reports — and "Export PDF" is simply "Save as PDF" in the browser's print dialog.
 */
const PrintCtx = createContext<((doc: ReactNode) => void) | null>(null);
export const usePrint = () => {
  const c = useContext(PrintCtx);
  if (!c) throw new Error("usePrint must be used inside PrintProvider");
  return c;
};

export function PrintProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<ReactNode>(null);
  const [tick, setTick] = useState(0);
  const print = useCallback((d: ReactNode) => { setDoc(d); setTick((t) => t + 1); }, []);

  useEffect(() => {
    if (!tick) return;
    const clear = () => setDoc(null);
    window.addEventListener("afterprint", clear);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => { cancelAnimationFrame(id); window.removeEventListener("afterprint", clear); };
  }, [tick]);

  return (
    <PrintCtx.Provider value={print}>
      {children}
      {doc && typeof document !== "undefined" && createPortal(<div id="print-root">{doc}</div>, document.body)}
    </PrintCtx.Provider>
  );
}

/** Letterhead + title + footer shared by every printed document. */
export function PrintSheet({ title, subtitle, children, className }: { title: string; subtitle?: ReactNode; children: ReactNode; className?: string }) {
  const { settings } = useDb();
  const { t, fmtDateTime, lang } = useI18n();
  return (
    <div className={cn("mx-auto max-w-[190mm] bg-white text-[12px] leading-relaxed text-black", className)}>
      <div className="flex items-center gap-4 border-b-2 border-brand-800 pb-3">
        {settings.logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={settings.logo} alt="" className="size-16 object-contain" />
          : <div className="flex size-16 items-center justify-center rounded-full bg-brand-800 text-3xl text-white">☪</div>}
        <div className="min-w-0 flex-1">
          <div className="text-xl font-bold text-brand-900">{lang === "ur" ? settings.madrasaNameUr : settings.madrasaName}</div>
          <div className="text-[11px] text-stone-700">{settings.address}</div>
          <div className="text-[11px] text-stone-700">{[settings.phone, settings.email, settings.website].filter(Boolean).join("  •  ")}</div>
        </div>
      </div>
      <div className="my-4 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">{t(title)}</h1>
        {subtitle && <div className="mt-0.5 text-[11px] text-stone-600">{subtitle}</div>}
      </div>
      {children}
      <div className="mt-8 border-t border-stone-300 pt-2 text-[10px] text-stone-500">
        {t("Printed on")} {fmtDateTime(new Date().toISOString())} — {settings.madrasaName}. {t("Student information is confidential. Access is limited to authorised staff.")}
      </div>
    </div>
  );
}

/** Plain bordered table for printed documents. */
export function PrintTable({ headers, rows, className }: { headers: string[]; rows: ReactNode[][]; className?: string }) {
  const { t } = useI18n();
  return (
    <table className={cn("w-full border-collapse text-[11px]", className)}>
      <thead>
        <tr>{headers.map((h, i) => <th key={i} className="border border-stone-400 bg-stone-100 px-1.5 py-1 text-start font-semibold">{t(h)}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => <tr key={i} className="break-inside-avoid">{r.map((c, j) => <td key={j} className="border border-stone-300 px-1.5 py-1 align-top">{c}</td>)}</tr>)}
      </tbody>
    </table>
  );
}

export function SignatureLine({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <div className="w-44 text-center">
      <div className="mb-1 h-10 border-b border-black" />
      <div className="text-[11px]">{t(label)}</div>
    </div>
  );
}
