"use client";
import { Eye, HandCoins } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Ltr, Stat } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { buildLedger, type LedgerRow } from "@/lib/services/fees";
import type { Payment } from "@/lib/types";
import { sum } from "@/lib/utils";
import { CollectFeeDialog } from "./collect-fee-dialog";
import { ReceiptModal } from "./receipt";

/** Fees tab of the student profile: totals, charges, receipts. Read-only without fees.manage. */
export function StudentFeesPanel({ studentId }: { studentId: string }) {
  const { t, fmtMoney, fmtMonth, fmtDate } = useI18n();
  const { scoped: db, can } = useAuth();
  const [collect, setCollect] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const rows = useMemo(() => buildLedger(db).filter((r) => r.record.studentId === studentId).sort((a, b) => b.record.month.localeCompare(a.record.month)), [db, studentId]);
  const payments = useMemo(() => db.payments.filter((p) => p.studentId === studentId).reverse(), [db.payments, studentId]);
  const billed = sum(rows.map((r) => r.net)), paid = sum(rows.map((r) => r.paid)), balance = sum(rows.map((r) => r.balance));

  const cols: Column<LedgerRow>[] = [
    { key: "month", header: "Month", cell: (r) => fmtMonth(r.record.month) },
    { key: "desc", header: "Description", cell: (r) => <span>{r.record.description}<span className="block text-xs text-stone-500">{t(r.record.category)}</span></span> },
    { key: "net", header: "Net", align: "end", hideBelow: "sm", cell: (r) => <span className="tabular">{fmtMoney(r.net)}</span> },
    { key: "paid", header: "Paid", align: "end", cell: (r) => <span className="tabular">{fmtMoney(r.paid)}</span> },
    { key: "bal", header: "Balance", align: "end", cell: (r) => <span className={r.balance ? "font-semibold text-red-600 tabular" : "tabular"}>{fmtMoney(r.balance)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  const payCols: Column<Payment>[] = [
    { key: "no", header: "Receipt No", cell: (p) => <Ltr className="font-medium">{p.receiptNo}</Ltr> },
    { key: "date", header: "Date", cell: (p) => fmtDate(p.date) },
    { key: "method", header: "Method", hideBelow: "sm", cell: (p) => t(p.method) },
    { key: "amount", header: "Amount", align: "end", cell: (p) => <span className="font-semibold tabular">{fmtMoney(p.amount)}</span> },
    { key: "a", header: "Actions", align: "end", cell: (p) => <IconButton label={t("View receipt")} onClick={() => setViewing(p.id)}><Eye className="size-4" /></IconButton> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Total billed" value={fmtMoney(billed)} />
          <Stat label="Paid" value={fmtMoney(paid)} />
          <Stat label="Outstanding" value={fmtMoney(balance)} tone={balance ? "red" : "green"} />
        </div>
        {can("fees.manage") && <Button onClick={() => setCollect(true)}><HandCoins className="size-4" />{t("Collect Fee")}</Button>}
      </div>
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.record.id} pageSize={10} defaultSort={undefined} empty={{ title: "No fee records", description: "No charges have been created for this student yet." }} />
      <Card>
        <CardHeader title={t("Receipts")} />
        <CardBody className="p-0 sm:p-0 pt-3 sm:pt-3">
          <DataTable columns={payCols} rows={payments} rowKey={(p) => p.id} pageSize={5} className="rounded-none border-0 shadow-none" empty={{ title: "No receipts yet", description: "Receipts appear here after a payment is recorded." }} />
        </CardBody>
      </Card>
      <CollectFeeDialog open={collect} onClose={() => setCollect(false)} studentId={studentId} />
      {viewing && <ReceiptModal paymentId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
