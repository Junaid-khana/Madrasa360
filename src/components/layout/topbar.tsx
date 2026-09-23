"use client";
import { KeyRound, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/misc";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth";
import { logActivity } from "@/lib/services/activity";
import { useI18n } from "@/lib/i18n";
import { GlobalSearch } from "./global-search";
import { LanguageSwitcher } from "./language-switcher";
import { Notifications } from "./notifications";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) return null;
  const signOut = () => { logActivity({ id: user.id, name: user.name }, "auth", "Signed out"); logout(); router.replace("/login"); };

  return (
    <header className="no-print sticky top-0 z-20 flex items-center gap-2 border-b border-stone-200 bg-white/95 px-3 py-2 backdrop-blur sm:gap-3 sm:px-6">
      <button onClick={onMenu} aria-label={t("Menu")} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"><Menu className="size-5" /></button>
      <GlobalSearch />
      <div className="ms-auto flex items-center gap-1 sm:gap-2">
        <div className="hidden sm:block"><LanguageSwitcher /></div>
        <Notifications />
        <div ref={ref} className="relative">
          <button onClick={() => setOpen((o) => !o)} aria-label={t("My account")} className="flex items-center gap-2 rounded-lg p-1 hover:bg-stone-100">
            <Avatar name={user.name} size="sm" />
            <span className="hidden text-start leading-tight md:block">
              <span className="block max-w-36 truncate text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-stone-500">{t(ROLE_LABEL[user.role])}</span>
            </span>
          </button>
          {open && (
            <div className="animate-fade-in absolute end-0 z-40 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
              <div className="border-b border-stone-100 px-3 py-2.5">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-stone-500">{t(ROLE_LABEL[user.role])}</p>
              </div>
              <div className="border-b border-stone-100 p-2 sm:hidden"><LanguageSwitcher /></div>
              <Link href="/settings?tab=security" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-stone-50"><KeyRound className="size-4 text-stone-400" />{t("My account")}</Link>
              <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="size-4" />{t("Sign out")}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
