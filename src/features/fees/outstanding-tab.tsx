"use client";
import { HandCoins, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Alert, Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { classLabel, getClass } from "@/lib/services/students";
import type { Student } from "@/lib/types";
import { sum } from "@/lib/utils";
import { useLedger } from "./shared";

interface Row { student: Student; balance: number; months: string[]; charges: number }

export function OutstandingTab({ onCollect }: { onCollect: (studentId: string) => void }) {
  const { t, fmtMoney, fmtMonth } = useI18n();
  const { can } = useAuth();
  const db = useDb();
  const ledger = useLedger();
  const rows = useMemo<Row[]>(() => {
    const by = new Map<string, Row>();
    for (const r of ledger) {
      if (r.balance <= 0 || !r.student) continue;
      const cur = by.get(r.student.id) ?? { student: r.student, balance: 0, months: [], charges: 0 };
      cur.balance += r.balance; cur.charges++;
      if (!cur.months.includes(r.record.month)) cur.months.push(r.record.month);
      by.set(r.student.id, cur);
    }
    return [...by.values()].map((x) => ({ ...x, months: x.months.sort() })).sort((a, b) => b.balance - a.balance);
  }, [ledger]);

  const columns: Column<Row>[] = [
    { key: "student", header: "Student", sort: (r) => r.student.fullName, text: (r) => `${r.student.fullName} (${r.student.id})`,
      cell: (r) => <div><Link href={`/students/${r.student.id}`} className="font-medium text-stone-900 hover:text-brand-700">{r.student.fullName}</Link><div className="text-xs text-stone-500"><Ltr>{r.student.id}</Ltr></div></div> },
    { key: "class", header: "Class", hideBelow: "lg", text: (r) => classLabel(getClass(db, r.student.classId)), cell: (r) => classLabel(getClass(db, r.student.classId)) },
    { key: "guardian", header: "Guardian", hideBelow: "md", text: (r) => `${r.student.guardian.name} ${r.student.guardian.phone}`, cell: (r) => <div>{r.student.guardian.name}<div className="text-xs text-stone-500"><Ltr>{r.student.guardian.phone}</Ltr></div></div> },
    { key: "months", header: "Months due", hideBelow: "sm", sort: (r) => r.months.length, text: (r) => r.months.join(" "), cell: (r) => <span className="text-xs">{r.months.map(fmtMonth).join(", ")}</span> },
    { key: "balance", header: "Balance", align: "end", sort: (r) => r.balance, text: (r) => r.balance, cell: (r) => <span className="font-semibold text-red-600 tabular">{fmtMoney(r.balance)}</span> },
    { key: "actions", header: "Actions", align: "end",
      cell: (r) => can("fees.manage") ? <Button size="sm" onClick={(e) => { e.stopPropagation(); onCollect(r.student.id); }}><HandCoins className="size-4" />{t("Collect")}</Button> : null },
  ];

  return (
    <div className="space-y-4">
      <Alert tone="info" className="flex flex-wrap items-center justify-between gap-3">
        <span>{t("{n} student(s) owe a total of {amount}.", { n: rows.length, amount: fmtMoney(sum(rows.map((r) => r.balance))) })}</span>
        {can("communication.send") && <LinkButton href="/communication?audience=fees" size="sm" variant="secondary"><MessageSquare className="size-4" />{t("Send fee reminders")}</LinkButton>}
      </Alert>
      <DataTable
        columns={columns} rows={rows} rowKey={(r) => r.student.id} exportName="outstanding-fees"
        searchText={(r) => `${r.student.fullName} ${r.student.id} ${r.student.guardian.name} ${r.student.guardian.phone}`} searchPlaceholder="Search student or ID…"
        defaultSort={{ key: "balance", dir: "desc" }}
        empty={{ title: "No outstanding fees", description: "Every student is fully paid." }}
      />
    </div>
  );
}
