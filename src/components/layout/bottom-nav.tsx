"use client";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BOTTOM_HREFS, isActive } from "./nav";
import { useVisibleNav } from "./sidebar";

/** Thumb-friendly navigation bar on phones. */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = useVisibleNav().filter((n) => BOTTOM_HREFS.includes(n.href)).slice(0, 4);
  return (
    <nav aria-label="Quick" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="flex">
        {items.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <li key={n.href} className="flex-1">
              <Link href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-800" : "text-stone-500")}>
                <n.icon className={cn("size-5", active && "text-brand-700")} />
                <span className="max-w-full truncate px-1">{t(n.label)}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button onClick={onMore} className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-stone-500">
            <Menu className="size-5" />{t("More")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
