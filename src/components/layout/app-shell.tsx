"use client";
import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { BottomNav } from "./bottom-nav";
import { NAV, isActive } from "./nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AccessDenied() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={<ShieldAlert className="size-6" />} title="Access denied" description="You do not have permission to open this page."
      action={<LinkButton href="/dashboard">{t("Go to dashboard")}</LinkButton>}
    />
  );
}

/** Page-level guard for finer rules than the route table (e.g. /students/new). */
export function Guard({ perm, children }: { perm: Parameters<ReturnType<typeof useAuth>["can"]>[0]; children: ReactNode }) {
  const { can } = useAuth();
  return can(perm) ? <>{children}</> : <AccessDenied />;
}

/** Auth gate + responsive frame. Everything under (app)/ renders inside this. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center"><Spinner className="size-8" /></div>;
  }

  const item = NAV.find((n) => isActive(pathname, n.href));
  const allowed = !item || item.href === "/settings" || item.perm.some(can);

  return (
    <div className="min-h-dvh">
      <Sidebar drawerOpen={drawer} onClose={() => setDrawer(false)} />
      <div className="lg:ps-64">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          {allowed ? children : <AccessDenied />}
        </main>
      </div>
      <BottomNav onMore={() => setDrawer(true)} />
    </div>
  );
}
