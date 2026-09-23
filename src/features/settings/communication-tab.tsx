"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Toggle } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { PROVIDERS } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { useSaveSettings } from "./use-save";

export function CommunicationTab() {
  const { t } = useI18n();
  const { settings } = useDb();
  const save = useSaveSettings();
  const [sms, setSms] = useState(settings.sms);
  const [n, setN] = useState(settings.notifications);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("SMS gateway")} description={t("Placeholder for a future SMS provider. Until one is connected, messages are simulated.")} />
        <CardBody className="space-y-4">
          <Alert tone="info">{t("API keys must never live in the browser in a real deployment. When you connect a provider, keep the key on the server (environment variable) and call it through a server route.")}</Alert>
          <FormGrid>
            <Field label={t("Provider")}>
              <Select value={sms.provider} onChange={(e) => setSms({ ...sms, provider: e.target.value })}>
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{t(p.label)}</option>)}
              </Select>
            </Field>
            <Field label={t("Sender ID")} hint={t("Name shown to parents, e.g. your madrasa short name.")}><Input dir="ltr" value={sms.senderId} onChange={(e) => setSms({ ...sms, senderId: e.target.value })} maxLength={11} /></Field>
            <Field label={t("API key (placeholder)")} className="sm:col-span-2"><Input type="password" dir="ltr" autoComplete="off" value={sms.apiKey} onChange={(e) => setSms({ ...sms, apiKey: e.target.value })} placeholder="••••••••" /></Field>
          </FormGrid>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Notification settings")} description={t("Choose which alerts appear in the bell menu.")} />
        <CardBody className="divide-y divide-stone-100">
          <Toggle label={t("Overdue fee alerts")} checked={n.feeReminders} onChange={(v) => setN({ ...n, feeReminders: v })} />
          <Toggle label={t("Absence alerts")} checked={n.absenceAlerts} onChange={(v) => setN({ ...n, absenceAlerts: v })} />
          <Toggle label={t("Leave requests waiting for approval")} checked={n.leaveRequests} onChange={(v) => setN({ ...n, leaveRequests: v })} />
          <Toggle label={t("Backup reminders")} checked={n.backupReminder} onChange={(v) => setN({ ...n, backupReminder: v })} />
        </CardBody>
      </Card>
      <div className="flex justify-end"><Button onClick={() => save({ sms, notifications: n }, "Communication settings updated")}>{t("Save changes")}</Button></div>
    </div>
  );
}
