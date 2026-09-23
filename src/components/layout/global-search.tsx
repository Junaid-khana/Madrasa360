"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classLabel, getClass } from "@/lib/services/students";
import { NAV } from "./nav";

/** Search students, teachers, classes and pages. Press "/" or Ctrl/Cmd+K to focus. */
export function GlobalSearch() {
  const { t } = useI18n();
  const { scoped, can } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if ((e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag)) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); input.current?.focus(); }
      if (e.key === "Escape") setOpen(false);
    };
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", close);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", close); };
  }, []);

  const n = q.trim().toLowerCase();
  const res = useMemo(() => {
    if (!n) return null;
    const students = can("students.view") ? scoped.students.filter((s) => `${s.fullName} ${s.id} ${s.fatherName} ${s.guardian.name} ${s.guardian.phone}`.toLowerCase().includes(n)).slice(0, 6) : [];
    const teachers = can("classes.view") ? scoped.teachers.filter((x) => x.name.toLowerCase().includes(n)).slice(0, 3) : [];
    const classes = can("classes.view") ? scoped.classes.filter((c) => classLabel(c).toLowerCase().includes(n)).slice(0, 3) : [];
    const pages = NAV.filter((x) => x.perm.some(can) && (t(x.label).toLowerCase().includes(n) || x.label.toLowerCase().includes(n))).slice(0, 3);
    return { students, teachers, classes, pages };
  }, [n, scoped, can, t]);

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const empty = res && !res.students.length && !res.teachers.length && !res.classes.length && !res.pages.length;

  return (
    <div ref={box} className="relative min-w-0 flex-1 md:max-w-md">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
      <input
        ref={input} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder={t("Search students, teachers, classes…")} aria-label={t("Search")}
        className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 ps-9 pe-3 text-base placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 sm:text-sm"
      />
      {open && res && (
        <div className="scroll-thin animate-fade-in absolute inset-x-0 z-40 mt-2 max-h-[70vh] overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {empty && <p className="px-4 py-6 text-center text-sm text-stone-500">{t("No results found")}</p>}
          {res.students.length > 0 && <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase text-stone-400">{t("Students")}</p>}
          {res.students.map((s) => (
            <button key={s.id} onClick={() => go(`/students/${s.id}`)} className="flex w-full items-center gap-3 px-4 py-2 text-start hover:bg-brand-50">
              <Avatar name={s.fullName} src={s.photo} size="sm" />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{s.fullName}</span>
                <span className="block truncate text-xs text-stone-500"><Ltr>{s.id}</Ltr> · {classLabel(getClass(scoped, s.classId))}</span></span>
            </button>
          ))}
          {res.teachers.length > 0 && <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase text-stone-400">{t("Teachers")}</p>}
          {res.teachers.map((x) => <button key={x.id} onClick={() => go("/classes?tab=teachers")} className="block w-full px-4 py-2 text-start text-sm hover:bg-brand-50">{x.name}</button>)}
          {res.classes.length > 0 && <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase text-stone-400">{t("Classes")}</p>}
          {res.classes.map((c) => <button key={c.id} onClick={() => go(`/classes/${c.id}`)} className="block w-full px-4 py-2 text-start text-sm hover:bg-brand-50">{classLabel(c)}</button>)}
          {res.pages.length > 0 && <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase text-stone-400">{t("Pages")}</p>}
          {res.pages.map((p) => <button key={p.href} onClick={() => go(p.href)} className="flex w-full items-center gap-2 px-4 py-2 text-start text-sm hover:bg-brand-50"><p.icon className="size-4 text-stone-400" />{t(p.label)}</button>)}
        </div>
      )}
    </div>
  );
}
