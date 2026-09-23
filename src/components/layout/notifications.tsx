"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { buildNotifications } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";

export function Notifications() {
  const { t } = useI18n();
  const { can } = useAuth();
  const db = useDb();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => buildNotifications(db, can), [db, can]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const dot = { amber: "bg-amber-500", red: "bg-red-500", blue: "bg-sky-500" };
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={t("Notifications")} aria-expanded={open} className="relative rounded-lg p-2.5 text-stone-600 hover:bg-stone-100">
        <Bell className="size-5" />
        {items.length > 0 && <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{items.length}</span>}
      </button>
      {open && (
        <div className="animate-fade-in absolute end-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white shadow-lg">
          <p className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold">{t("Notifications")}</p>
          {items.length === 0 ? <p className="px-4 py-6 text-center text-sm text-stone-500">{t("No new notifications")}</p> : (
            <ul className="divide-y divide-stone-100">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-stone-50">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[n.tone])} />
                    <span className="text-stone-700">{t(n.text, n.vars)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
