"use client";
import { Laptop, Smartphone } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { changeOwnPassword, passwordRule } from "@/lib/services/users";
import { AuditLog } from "./audit-log";

function ChangePassword() {
  const { t } = useI18n();
  const { user } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!cur) e.cur = "Enter your current password";
    const rule = passwordRule.safeParse(next);
    if (!rule.success) e.next = rule.error.issues[0].message;
    if (next !== again) e.again = "Passwords do not match";
    setErrors(e);
    if (Object.keys(e).length || !user) return;
    setBusy(true);
    try {
      await changeOwnPassword(user.id, cur, next, actor);
      toast.success(t("Password changed"));
      setCur(""); setNext(""); setAgain("");
    } catch (err) {
      toast.error(err instanceof Error ? t(err.message) : t("Something went wrong. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title={t("Change password")} description={t("Use at least 8 characters. Do not share your password.")} />
      <CardBody className="max-w-md space-y-4">
        <Field label={t("Current password")} error={errors.cur}><Input type="password" dir="ltr" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} error={!!errors.cur} /></Field>
        <Field label={t("New password")} error={errors.next}><Input type="password" dir="ltr" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={!!errors.next} /></Field>
        <Field label={t("Confirm new password")} error={errors.again}><Input type="password" dir="ltr" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} error={!!errors.again} /></Field>
        <Button onClick={submit} loading={busy}>{t("Change password")}</Button>
      </CardBody>
    </Card>
  );
}

function Sessions() {
  const { t, fmtDateTime } = useI18n();
  const { user } = useAuth();
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const device = /Mobile|Android|iPhone/i.test(ua) ? "Phone" : "Computer";
  // Only the current session is real in this demo; previous ones are labelled sample data.
  const rows = [
    { id: "cur", name: `${t(device)} — ${t("this device")}`, mobile: device === "Phone", when: new Date().toISOString(), current: true },
    { id: "s1", name: t("Phone"), mobile: true, when: user?.lastLogin ?? new Date().toISOString(), current: false },
  ];
  return (
    <Card>
      <CardHeader title={t("Active sessions")} description={t("Devices where this account is signed in. Previous sessions are sample data until a real backend is connected.")} />
      <CardBody className="divide-y divide-stone-100 p-0 sm:p-0">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            {r.mobile ? <Smartphone className="size-5 text-stone-400" /> : <Laptop className="size-5 text-stone-400" />}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{r.name}</p><p className="text-xs text-stone-500">{fmtDateTime(r.when)}</p></div>
            {r.current ? <Badge tone="green">{t("Current")}</Badge> : <Badge tone="gray">{t("Sample")}</Badge>}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function SecurityTab() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <ChangePassword />
      <Sessions />
      {user?.role === "super_admin" && <AuditLog />}
    </div>
  );
}
