"use client";
import { Eye, HandCoins } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { Ltr } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { useActor, useAuth } from "@/lib/auth/auth";
import { FEE_CATEGORIES } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { setWaived, type LedgerRow } from "@/lib/services/fees";
import { classLabel } from "@/lib/services/students";
import { monthOf, todayISO } from "@/lib/utils";
import { studentClass, useLedger } from "./shared";

const STATUSES = ["Paid", "Partially Paid", "Unpaid", "Waived"];

export function FeeRecordsTab({ onCollect }: { onCollect: (studentId: string) => void }) {
  const { t, fmtMoney, fmtMonth } = useI18n();
  const { can, scoped } = useAuth();
  const db = useDb();
  const ledger = useLedger();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const manage = can("fees.manage");
  const [month, setMonth] = useState(monthOf(todayISO()));
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");

  const months = useMemo(() => Array.from(new Set([monthOf(todayISO()), ...ledger.map((r) => r.record.month)])).sort().reverse(), [ledger]);
  const rows = useMemo(() => ledger.filter((r) =>
    (!month || r.record.month === month) && (!category || r.record.category === category) &&
    (!status || r.status === status) && (!classId || r.student?.classId === classId)), [ledger, month, category, status, classId]);

  const toggleWaive = async (r: LedgerRow) => {
    const waive = !r.record.waived;
    const ok = await confirm({
      title: waive ? "Waive this fee?" : "Remove the waiver?",
      message: waive ? "The student will not have to pay this charge." : "The charge becomes payable again.",
      confirmLabel: waive ? "Waive" : "Confirm",
    });
    if (!ok) return;
    setWaived(r.record.id, waive, actor);
    toast.success(t("Saved successfully"));
  };

  const columns: Column<LedgerRow>[] = [
    { key: "student", header: "Student", sort: (r) => r.student?.fullName ?? "", text: (r) => `${r.student?.fullName ?? ""} (${r.record.studentId})`,
      cell: (r) => <div className="min-w-0"><Link href={`/students/${r.record.studentId}`} className="font-medium text-stone-900 hover:text-brand-700">{r.student?.fullName ?? r.record.studentId}</Link><div className="text-xs text-stone-500"><Ltr>{r.record.studentId}</Ltr></div></div> },
    { key: "class", header: "Class", hideBelow: "xl", sort: (r) => studentClass(db, r), text: (r) => studentClass(db, r), cell: (r) => studentClass(db, r) },
    { key: "month", header: "Month", hideBelow: "md", sort: (r) => r.record.month, text: (r) => r.record.month, cell: (r) => fmtMonth(r.record.month) },
    { key: "desc", header: "Description", hideBelow: "xl", text: (r) => r.record.description, cell: (r) => <span>{r.record.description}<span className="block text-xs text-stone-500">{t(r.record.category)}</span></span> },
    { key: "amount", header: "Amount", align: "end", hideBelow: "xl", sort: (r) => r.record.amount, text: (r) => r.record.amount, cell: (r) => <span className="tabular">{fmtMoney(r.record.amount)}</span> },
    { key: "discount", header: "Discount", align: "end", hideBelow: "xl", sort: (r) => r.record.discount, text: (r) => r.record.discount, cell: (r) => <span className="tabular">{fmtMoney(r.record.discount)}</span> },
    { key: "net", header: "Net", align: "end", hideBelow: "md", sort: (r) => r.net, text: (r) => r.net, cell: (r) => <span className="tabular">{fmtMoney(r.net)}</span> },
    { key: "paid", header: "Paid", align: "end", sort: (r) => r.paid, text: (r) => r.paid, cell: (r) => <span className="tabular">{fmtMoney(r.paid)}</span> },
    { key: "balance", header: "Balance", align: "end", sort: (r) => r.balance, text: (r) => r.balance, cell: (r) => <span className={r.balance ? "font-semibold text-red-600 tabular" : "tabular"}>{fmtMoney(r.balance)}</span> },
    { key: "status", header: "Status", sort: (r) => r.status, text: (r) => t(r.status), cell: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "Actions", align: "end",
      cell: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {manage && r.balance > 0 && <Button size="sm" onClick={() => onCollect(r.record.studentId)}><HandCoins className="size-4" />{t("Collect")}</Button>}
          {manage && (r.record.waived || r.balance > 0) && <Button size="sm" variant="secondary" onClick={() => toggleWaive(r)}>{r.record.waived ? t("Un-waive") : t("Waive")}</Button>}
          {!manage && <Link href={`/students/${r.record.studentId}`} aria-label={t("View profile")} className="rounded p-2 text-stone-500 hover:bg-stone-100"><Eye className="size-4" /></Link>}
        </div>
      ) },
  ];

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(r) => r.record.id} exportName="fee-records" exportSubtitle={month ? fmtMonth(month) : t("All")}
      searchText={(r) => `${r.student?.fullName ?? ""} ${r.record.studentId} ${r.record.description} ${r.student?.guardian.name ?? ""}`} searchPlaceholder="Search student or ID…"
      defaultSort={{ key: "balance", dir: "desc" }}
      toolbar={<>
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" aria-label={t("Month")}>
          <option value="">{t("All")} · {t("Month")}</option>
          {months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto" aria-label={t("Category")}>
          <option value="">{t("All")} · {t("Category")}</option>
          {FEE_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label={t("Status")}>
          <option value="">{t("All")} · {t("Status")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </Select>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto" aria-label={t("Class")}>
          <option value="">{t("All")} · {t("Class")}</option>
          {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
        </Select>
      </>}
      renderCard={(r) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-900">{r.student?.fullName ?? r.record.studentId}</p>
            <p className="truncate text-xs text-stone-500">{r.record.description} · {fmtMonth(r.record.month)}</p>
            <div className="mt-1.5 flex items-center gap-2"><StatusBadge status={r.status} /><span className="text-sm font-semibold tabular">{fmtMoney(r.balance || r.paid)}</span></div>
          </div>
          {manage && r.balance > 0 && <Button size="sm" onClick={(e) => { e.stopPropagation(); onCollect(r.record.studentId); }}>{t("Collect")}</Button>}
        </div>
      )}
      empty={{ title: "No fee records", description: "Nothing matches these filters. Use “Generate monthly fees” to create this month's charges." }}
    />
  );
}
