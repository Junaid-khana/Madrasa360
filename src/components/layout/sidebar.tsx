"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV, isActive } from "./nav";

export function useVisibleNav() {
  const { can } = useAuth();
  return NAV.filter((n) => n.perm.some(can));
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = useVisibleNav();
  return (
    <nav aria-label="Main" className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href} href={n.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-white/15 text-white" : "text-brand-100/80 hover:bg-white/10 hover:text-white")}
          >
            <n.icon className="size-[18px] shrink-0" />
            <span className="truncate">{t(n.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { settings } = useDb();
  const { lang, t } = useI18n();
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <Logo tone="light" className="size-10 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-white">{lang === "ur" ? settings.madrasaNameUr : settings.madrasaName}</p>
        <p className="truncate text-xs text-brand-200">{t("Madrasa Management System")}</p>
      </div>
    </div>
  );
}

/** Desktop: fixed sidebar. Phone/tablet: slide-in drawer (see AppShell). */
export function Sidebar({ drawerOpen, onClose }: { drawerOpen: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <aside className="no-print fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-brand-900 lg:flex">
        <Brand />
        <NavList />
      </aside>

      <div className={cn("no-print fixed inset-0 z-40 lg:hidden", drawerOpen ? "" : "pointer-events-none")} aria-hidden={!drawerOpen}>
        <div className={cn("absolute inset-0 bg-stone-900/50 transition-opacity", drawerOpen ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <aside className={cn("absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-brand-900 shadow-xl transition-transform duration-200",
          drawerOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full")}>
          <button onClick={onClose} aria-label={t("Close")} className="absolute end-3 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10"><X className="size-5" /></button>
          <Brand />
          <NavList onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
