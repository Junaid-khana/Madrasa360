"use client";
import { CalendarClock, DatabaseBackup, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Alert } from "@/components/ui/misc";
import { Toggle } from "@/components/ui/form";
import { useActor, useAuth } from "@/lib/auth/auth";
import { store, useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { downloadBackup, exportCSV, exportFinancial, restoreBackup, type ExportKind } from "@/lib/services/backup";

const EXPORTS: { kind: ExportKind | "financial"; title: string; desc: string; count: (d: ReturnType<typeof useDb>) => number }[] = [
  { kind: "students", title: "Student data", desc: "All student, guardian and admission details.", count: (d) => d.students.length },
  { kind: "financial", title: "Financial data", desc: "Fee charges, payments, receipts and donations.", count: (d) => d.fees.length + d.payments.length + d.donations.length },
  { kind: "attendance", title: "Attendance", desc: "Daily attendance for every student and class.", count: (d) => d.attendance.reduce((n, s) => n + Object.keys(s.entries).length, 0) },
  { kind: "hifz", title: "Hifz records", desc: "Sabaq, Sabqi and Manzil history.", count: (d) => d.hifz.length },
  { kind: "exams", title: "Exam results", desc: "Marks, grades and remarks.", count: (d) => d.results.length },
  { kind: "donations", title: "Donations", desc: "Donor list with receipt numbers.", count: (d) => d.donations.length },
];

function Row({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</div>
      <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-medium text-stone-900">{title}</p><p className="text-xs text-stone-500">{desc}</p></div>
      {action}
    </div>
  );
}

/** Data Management: exports, backup status, restore and demo reset. */
export function DataTab() {
  const { t, fmtDateTime, fmtNum } = useI18n();
  const db = useDb();
  const { user, logout } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);

  const last = db.backup.lastBackupAt ? new Date(db.backup.lastBackupAt) : null;
  const days = last ? Math.floor((Date.now() - last.getTime()) / 86400_000) : null;
  const fresh = days !== null && days <= 7;

  const fail = (e: unknown) => toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));

  const doExport = (kind: ExportKind | "financial") => {
    try { if (kind === "financial") exportFinancial(actor); else exportCSV(kind, actor); toast.success(t("Export downloaded")); } catch (e) { fail(e); }
  };
  const backupNow = () => { try { downloadBackup(actor); toast.success(t("Backup downloaded")); } catch (e) { fail(e); } };

  const restore = async (f?: File) => {
    if (!f) return;
    const ok = await confirm({
      title: "Restore from this backup?",
      message: "This replaces ALL current data (students, fees, attendance, users…) with the contents of the file. This cannot be undone — download a backup first if unsure.",
      confirmLabel: "Replace all data", tone: "danger",
    });
    if (!ok) return;
    try { restoreBackup(await f.text(), actor); toast.success(t("Data restored from backup")); } catch (e) { fail(e); }
  };

  const reset = async () => {
    if (!(await confirm({ title: "Reset to demo data?", message: "All changes you made will be lost and sample data will be loaded.", confirmLabel: "Continue", tone: "danger" }))) return;
    if (!(await confirm({ title: "Really erase everything?", message: "Last check: every record in this browser will be replaced. You will be signed out.", confirmLabel: "Yes, reset", tone: "danger" }))) return;
    store.resetToDemo(); logout(); router.replace("/login");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("Backup status")} action={<Badge tone={fresh ? "green" : "amber"}>{t(fresh ? "Up to date" : "Backup recommended")}</Badge>} />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-stone-500">{t("Last backup")}</p><p className="text-sm font-medium">{last ? fmtDateTime(last.toISOString()) : t("Never")}</p></div>
            <div><p className="text-xs text-stone-500">{t("Last export")}</p><p className="text-sm font-medium">{db.backup.lastExportAt ? fmtDateTime(db.backup.lastExportAt) : t("Never")}</p></div>
            <div><p className="text-xs text-stone-500">{t("Records stored")}</p><p className="text-sm font-medium tabular">{fmtNum(db.students.length + db.fees.length + db.payments.length + db.attendance.length + db.hifz.length + db.results.length)}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backupNow}><DatabaseBackup className="size-4" />{t("Backup now")}</Button>
          </div>
          <Toggle label={<span>{t("Automatic daily backup")} <span className="text-xs text-stone-400">— {t("Connect a database to enable automated backups")}</span></span>} checked={false} onChange={() => undefined} disabled />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("Export data")} description={t("Download spreadsheets (CSV opens in Excel) for your own records.")} />
        <CardBody className="divide-y divide-stone-100 py-1 sm:py-1">
          {EXPORTS.map((x) => (
            <Row key={x.kind} icon={<CalendarClock className="size-5" />} title={t(x.title)} desc={`${t(x.desc)} (${fmtNum(x.count(db))} ${t("rows")})`}
              action={<Button variant="secondary" size="sm" onClick={() => doExport(x.kind)}><Download className="size-4" />{t("Export CSV")}</Button>} />
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("Restore")} description={t("Load a backup file created with “Backup now”.")} />
        <CardBody className="space-y-3">
          <Alert tone="warn">{t("Restoring replaces all current data. Take a backup first.")}</Alert>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
          <Button variant="secondary" onClick={() => file.current?.click()}><Upload className="size-4" />{t("Restore from file…")}</Button>
        </CardBody>
      </Card>

      {user?.role === "super_admin" && (
        <Card className="border-red-200">
          <CardHeader title={t("Reset demo data")} description={t("Erase everything in this browser and reload the sample data.")} />
          <CardBody><Button variant="danger" onClick={reset}><RotateCcw className="size-4" /><Trash2 className="size-4" />{t("Reset demo data")}</Button></CardBody>
        </Card>
      )}
    </div>
  );
}
