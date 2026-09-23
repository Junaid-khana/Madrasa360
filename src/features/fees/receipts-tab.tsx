"use client";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { PAYMENT_METHODS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { userName } from "@/lib/services/students";
import type { Payment } from "@/lib/types";
import { ReceiptModal } from "./receipt";

export function ReceiptsTab() {
  const { t, fmtDate, fmtMoney } = useI18n();
  const { scoped: db } = useAuth();
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const students = useMemo(() => new Map(db.students.map((s) => [s.id, s])), [db.students]);
  const rows = useMemo(() => [...db.payments].reverse().filter((p) =>
    (!method || p.method === method) && (!from || p.date >= from) && (!to || p.date <= to)), [db.payments, method, from, to]);

  const columns: Column<Payment>[] = [
    { key: "no", header: "Receipt No", sort: (p) => p.receiptNo, text: (p) => p.receiptNo, cell: (p) => <Ltr className="font-medium">{p.receiptNo}</Ltr> },
    { key: "date", header: "Date", sort: (p) => p.date, text: (p) => p.date, cell: (p) => fmtDate(p.date) },
    { key: "student", header: "Student", sort: (p) => students.get(p.studentId)?.fullName ?? "", text: (p) => `${students.get(p.studentId)?.fullName ?? ""} (${p.studentId})`,
      cell: (p) => <div><Link href={`/students/${p.studentId}`} className="font-medium text-stone-900 hover:text-brand-700">{students.get(p.studentId)?.fullName ?? p.studentId}</Link><div className="text-xs text-stone-500"><Ltr>{p.studentId}</Ltr></div></div> },
    { key: "amount", header: "Amount", align: "end", sort: (p) => p.amount, text: (p) => p.amount, cell: (p) => <span className="font-semibold tabular">{fmtMoney(p.amount)}</span> },
    { key: "method", header: "Method", hideBelow: "sm", text: (p) => t(p.method), cell: (p) => t(p.method) },
    { key: "by", header: "Received by", hideBelow: "lg", text: (p) => userName(db, p.receivedBy), cell: (p) => userName(db, p.receivedBy) },
    { key: "actions", header: "Actions", align: "end", cell: (p) => <IconButton label={t("View receipt")} onClick={(e) => { e.stopPropagation(); setViewing(p.id); }}><Eye className="size-4" /></IconButton> },
  ];

  return (
    <>
      <DataTable
        columns={columns} rows={rows} rowKey={(p) => p.id} exportName="fee-receipts" onRowClick={(p) => setViewing(p.id)}
        searchText={(p) => `${p.receiptNo} ${p.studentId} ${students.get(p.studentId)?.fullName ?? ""}`} searchPlaceholder="Search receipt no or student…"
        toolbar={<>
          <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-auto" aria-label={t("Method")}>
            <option value="">{t("All")} · {t("Method")}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label={t("From")} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label={t("To")} />
        </>}
        empty={{ title: "No receipts yet", description: "Receipts appear here after a payment is recorded." }}
      />
      {viewing && <ReceiptModal paymentId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
