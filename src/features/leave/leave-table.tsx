"use client";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classLabel, getClass } from "@/lib/services/students";
import type { LeaveRecord } from "@/lib/types";
import { parseISO } from "@/lib/utils";

export const leaveDays = (l: Pick<LeaveRecord, "startDate" | "endDate">) =>
  Math.round((parseISO(l.endDate).getTime() - parseISO(l.startDate).getTime()) / 86400000) + 1;

/** Leave list shared by the Leave page and the student profile. `compact` hides the student/class columns. */
export function LeaveTable({ rows, compact, toolbar, onDecide, empty, exportName }: {
  rows: LeaveRecord[];
  compact?: boolean;
  toolbar?: React.ReactNode;
  onDecide?: (l: LeaveRecord, d: "Approved" | "Rejected") => void;
  empty?: { title?: string; description?: string; action?: React.ReactNode };
  exportName?: string;
}) {
  const { t, fmtDate, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const sname = (l: LeaveRecord) => scoped.students.find((s) => s.id === l.studentId)?.fullName ?? l.studentId;
  const cname = (l: LeaveRecord) => {
    const s = scoped.students.find((x) => x.id === l.studentId);
    return s ? classLabel(getClass(scoped, s.classId)) : "—";
  };

  const actions = (l: LeaveRecord) => l.status === "Pending" && onDecide ? (
    <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="soft" onClick={() => onDecide(l, "Approved")}><Check className="size-4" />{t("Approve")}</Button>
      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => onDecide(l, "Rejected")}><X className="size-4" />{t("Reject")}</Button>
    </div>
  ) : null;

  const columns = useMemo<Column<LeaveRecord>[]>(() => [
    ...(compact ? [] : [
      { key: "student", header: "Student", sort: sname, text: sname, cell: (l: LeaveRecord) => (
        <Link href={`/students/${l.studentId}`} onClick={(e) => e.stopPropagation()} className="block min-w-0 hover:text-brand-700"><span className="block font-medium text-stone-900">{sname(l)}</span><Ltr className="text-xs text-stone-500">{l.studentId}</Ltr></Link>
      ) },
      { key: "class", header: "Class", cell: cname, text: cname, hideBelow: "lg" as const, sort: cname },
    ]),
    { key: "type", header: "Leave type", cell: (l) => t(l.type), text: (l) => l.type, hideBelow: "md" },
    { key: "from", header: "From", cell: (l) => fmtDate(l.startDate), sort: (l) => l.startDate, text: (l) => l.startDate },
    { key: "to", header: "To", cell: (l) => fmtDate(l.endDate), sort: (l) => l.endDate, text: (l) => l.endDate, hideBelow: "sm" },
    { key: "days", header: "Days", cell: (l) => fmtNum(leaveDays(l)), sort: leaveDays, text: leaveDays, align: "center", hideBelow: "md" },
    { key: "reason", header: "Reason", cell: (l) => <span className="line-clamp-2 max-w-56">{l.reason}</span>, text: (l) => l.reason, hideBelow: "lg" },
    { key: "status", header: "Status", cell: (l) => <StatusBadge status={l.status} />, sort: (l) => l.status, text: (l) => l.status },
    { key: "by", header: "Approved by", cell: (l) => l.approvedBy || "—", text: (l) => l.approvedBy, hideBelow: "lg" },
    { key: "remarks", header: "Remarks", cell: (l) => <span className="line-clamp-2 max-w-48">{l.remarks || "—"}</span>, text: (l) => l.remarks, hideBelow: "lg" },
    ...(onDecide ? [{ key: "act", header: "Actions", align: "end" as const, cell: actions }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [compact, onDecide, scoped, t, fmtDate, fmtNum]);

  const card = (l: LeaveRecord) => (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">{!compact && <p className="truncate font-medium text-stone-900">{sname(l)} <Ltr className="text-xs text-stone-500">{l.studentId}</Ltr></p>}
          <p className="text-sm text-stone-700">{t(l.type)} · {fmtDate(l.startDate)} – {fmtDate(l.endDate)} ({fmtNum(leaveDays(l))} {t("days")})</p></div>
        <StatusBadge status={l.status} />
      </div>
      <p className="text-sm text-stone-500">{l.reason}</p>
      {actions(l)}
    </div>
  );

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(l) => l.id} pageSize={compact ? 5 : 10} exportName={exportName} renderCard={card} toolbar={toolbar}
      searchText={compact ? undefined : (l) => `${sname(l)} ${l.studentId} ${l.reason} ${l.type} ${l.status}`} searchPlaceholder="Search leave…"
      defaultSort={{ key: "from", dir: "desc" }} empty={empty}
    />
  );
}
