"use client";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form";
import { useAuth } from "@/lib/auth/auth";
import { SESSIONS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { dayAttendance, sheetCounts, type AttendanceCounts } from "@/lib/services/attendance";
import { classLabel, getClass, userName } from "@/lib/services/students";
import type { AttendanceSheet } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import type { Selection } from "./shared";

interface Row { sheet: AttendanceSheet; counts: AttendanceCounts; className: string }

export function HistoryTab({ onEdit }: { onEdit: (s: Selection) => void }) {
  const { t, fmtDate, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const today = todayISO();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classId, setClassId] = useState("");
  const [session, setSession] = useState("");
  const canMark = can("attendance.mark");

  const rows = useMemo<Row[]>(
    () => scoped.attendance
      .filter((a) => (!from || a.date >= from) && (!to || a.date <= to) && (!classId || a.classId === classId) && (!session || a.session === session))
      .map((sheet) => ({ sheet, counts: sheetCounts(sheet), className: classLabel(getClass(scoped, sheet.classId)) })),
    [scoped, from, to, classId, session],
  );
  const day = useMemo(() => dayAttendance(scoped, today), [scoped, today]);

  const edit = (r: Row) => onEdit({ date: r.sheet.date, classId: r.sheet.classId, session: r.sheet.session });
  const columns: Column<Row>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="font-medium text-stone-900">{fmtDate(r.sheet.date)}</span>, sort: (r) => r.sheet.date, text: (r) => r.sheet.date },
    { key: "class", header: "Class", cell: (r) => r.className, sort: (r) => r.className, text: (r) => r.className },
    { key: "session", header: "Session", cell: (r) => t(r.sheet.session), hideBelow: "sm", text: (r) => r.sheet.session },
    { key: "p", header: "Present", cell: (r) => <span className="text-brand-700 tabular">{fmtNum(r.counts.present)}</span>, sort: (r) => r.counts.present, text: (r) => r.counts.present, align: "center" },
    { key: "a", header: "Absent", cell: (r) => <span className={r.counts.absent ? "font-semibold text-red-600 tabular" : "text-stone-400 tabular"}>{fmtNum(r.counts.absent)}</span>, sort: (r) => r.counts.absent, text: (r) => r.counts.absent, align: "center" },
    { key: "l", header: "Leave", cell: (r) => <span className="text-sky-700 tabular">{fmtNum(r.counts.leave)}</span>, text: (r) => r.counts.leave, align: "center", hideBelow: "sm" },
    { key: "pct", header: "Attendance %", cell: (r) => <Badge tone={r.counts.percent >= 90 ? "green" : r.counts.percent >= 75 ? "amber" : "red"}>{fmtNum(r.counts.percent)}%</Badge>, sort: (r) => r.counts.percent, text: (r) => r.counts.percent },
    { key: "by", header: "Marked by", cell: (r) => userName(scoped, r.sheet.markedBy), hideBelow: "lg", text: (r) => userName(scoped, r.sheet.markedBy) },
    { key: "act", header: "Actions", align: "end", cell: (r) => (
      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); edit(r); }}><Pencil className="size-3.5" />{t(canMark ? "Edit" : "View")}</Button>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("Absent today")} description={fmtDate(today)} />
        <CardBody className="pt-3">
          {day.absentees.length === 0 ? (
            <p className="text-sm text-stone-500">{t(day.counts.total === 0 ? "Attendance not yet marked" : "Everyone marked so far is present")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {day.absentees.slice(0, 16).map((s) => (
                <Link key={s.id} href={`/students/${s.id}`} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-800 hover:bg-red-100">
                  {s.fullName} <span className="text-xs text-red-600/80">· {classLabel(getClass(scoped, s.classId))}</span>
                </Link>
              ))}
              {day.absentees.length > 16 && <span className="self-center text-sm text-stone-500">+{fmtNum(day.absentees.length - 16)}</span>}
            </div>
          )}
        </CardBody>
      </Card>

      <DataTable
        columns={columns} rows={rows} rowKey={(r) => r.sheet.id} pageSize={10} exportName="attendance-history"
        searchText={(r) => `${r.className} ${r.sheet.date} ${userName(scoped, r.sheet.markedBy)}`} onRowClick={edit}
        defaultSort={{ key: "date", dir: "desc" }}
        empty={{ title: "No attendance saved yet", description: "Saved attendance sheets will appear here." }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} aria-label={t("From")} className="w-auto" />
            <Input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} aria-label={t("To")} className="w-auto" />
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto" aria-label={t("Class")}>
              <option value="">{t("All classes")}</option>
              {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </Select>
            <Select value={session} onChange={(e) => setSession(e.target.value)} className="w-auto" aria-label={t("Session")}>
              <option value="">{t("All sessions")}</option>
              {SESSIONS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
            </Select>
          </div>
        }
      />
    </div>
  );
}
