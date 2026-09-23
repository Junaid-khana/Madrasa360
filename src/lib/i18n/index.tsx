"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANG_COOKIE } from "../constants";
import { ur } from "./ur";

export type Lang = "en" | "ur";

/**
 * Localisation: every UI string goes through `t("English text")`.
 * The English text is the key; `src/lib/i18n/ur/*.ts` map it to Urdu. Missing keys fall back to English,
 * so untranslated text never breaks the UI. Interpolation: t("Hello {name}", { name }).
 */
interface I18n {
  lang: Lang;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  setLang(l: Lang): void;
  t(key: string, vars?: Record<string, string | number>): string;
  fmtNum(n: number): string;
  fmtMoney(n: number): string;
  fmtDate(iso?: string | null): string;
  fmtDateTime(iso?: string | null): string;
  fmtMonth(yyyymm: string): string;
  fmtTime(iso?: string | null): string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ur" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<I18n>(() => {
    // Latin digits in both languages keeps numbers, phone numbers and dates readable.
    const locale = lang === "ur" ? "ur-PK-u-nu-latn" : "en-GB";
    const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
    const dateTimeFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
    const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
    const numFmt = new Intl.NumberFormat("en-PK");
    const parse = (iso: string) => (iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso));
    const dict = lang === "ur" ? ur : null;
    return {
      lang, dir, isRtl: lang === "ur", setLang,
      t: (key, vars) => {
        let s = dict?.[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      fmtNum: (n) => numFmt.format(n),
      fmtMoney: (n) => `Rs ${numFmt.format(Math.round(n))}`,
      fmtDate: (iso) => (iso ? dateFmt.format(parse(iso)) : "—"),
      fmtDateTime: (iso) => (iso ? dateTimeFmt.format(parse(iso)) : "—"),
      fmtTime: (iso) => (iso ? timeFmt.format(parse(iso)) : "—"),
      fmtMonth: (m) => monthFmt.format(new Date(`${m}-01T00:00:00`)),
    };
  }, [lang, dir, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
/** Shorthand: `const t = useT();` */
export const useT = () => useI18n().t;
