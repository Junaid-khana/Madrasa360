"use client";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT();
  return (
    <nav aria-label="Breadcrumb" className="no-print mb-2 flex flex-wrap items-center gap-1 text-xs text-stone-500">
      <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-brand-700"><Home className="size-3.5" />{t("Dashboard")}</Link>
      {items.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="size-3.5 rtl:rotate-180" />
          {c.href ? <Link href={c.href} className="hover:text-brand-700">{t(c.label)}</Link> : <span className="text-stone-700">{c.label === "" ? "" : t(c.label)}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Title row used at the top of every page: breadcrumbs, title, subtitle and action buttons. */
export function PageHeader({ title, description, crumbs, actions }: { title: string; description?: string; crumbs?: Crumb[]; actions?: ReactNode }) {
  const t = useT();
  return (
    <header className="no-print mb-5">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">{t(title)}</h1>
          {description && <p className="mt-1 text-sm text-stone-500">{t(description)}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
