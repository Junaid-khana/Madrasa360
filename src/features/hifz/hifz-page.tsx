"use client";
import { BookOpen, ClipboardCheck, Layers, Plus, TrendingUp, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { CHART } from "@/components/charts/theme";
import { StatusBadge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { Avatar, Ltr, ProgressBar, Stat } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { hifzStats, revisionStatus, type RevisionStatus } from "@/lib/services/hifz";
import { classLabel, getClass, hifzProgressPercent } from "@/lib/services/students";
import type { ClassRoom, HifzRecord, Student } from "@/lib/types";
import { sum, todayISO } from "@/lib/utils";
import { HifzEntryDialog } from "./hifz-entry-dialog";
import { HifzProgressPanel } from "./hifz-progress-panel";

interface Row { s: Student; cls?: ClassRoom; last?: HifzRecord; rev: RevisionStatus; progress: number; today: boolean }

export function HifzPage() {
  const { t, fmtNum, fmtDate } = useI18n();
  const { scoped, can, user } = useAuth();
  const params = useSearchParams();
  const [dialog, setDialog] = useState<{ open: boolean; studentId?: string }>({ open: params.get("add") === "1", studentId: params.get("student") ?? undefined });
  const [detail, setDetail] = useState<string | null>(null);
  const [tab, setTab] = useState(user?.role === "teacher" ? "quick" : "students");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [rev, setRev] = useState("");
  const canRecord = can("hifz.record");
  const today = todayISO();

  const stats = useMemo(() => hifzStats(scoped, today), [scoped, today]);
  const rows = useMemo<Row[]>(() => {
    const by = new Map<string, HifzRecord[]>();
    for (const r of scoped.hifz) (by.get(r.studentId) ?? by.set(r.studentId, []).get(r.studentId)!).push(r);
    return scoped.students
      .filter((s) => s.status === "Active" && s.hifz.status !== "Not Started")
      .map((s) => {
        const recs = (by.get(s.id) ?? []).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
        return { s, cls: getClass(scoped, s.classId), last: recs[0], rev: revisionStatus(recs, today), progress: hifzProgressPercent(s), today: recs[0]?.date === today };
      });
  }, [scoped, today]);

  const filtered = rows.filter((r) => (!classId || r.s.classId === classId) && (!status || r.s.hifz.status === status) && (!rev || r.rev === rev));
  const pending = rows.filter((r) => r.s.hifz.status === "In Progress" && !r.today);
  const classAvg = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) (m.get(r.s.classId) ?? m.set(r.s.classId, []).get(r.s.classId)!).push(r);
    return [...m.entries()].map(([id, rs]) => ({ cls: getClass(scoped, id), n: rs.length, avg: Math.round(sum(rs.map((x) => x.progress)) / rs.length) }))
      .sort((a, b) => classLabel(a.cls).localeCompare(classLabel(b.cls)));
  }, [rows, scoped]);

  const record = (studentId?: string) => setDialog({ open: true, studentId });
  const recordBtn = (r: Row) => canRecord && (
    <Button size="sm" variant={r.today ? "secondary" : "soft"} onClick={(e) => { e.stopPropagation(); record(r.s.id); }}>
      <Plus className="size-4" />{t(r.today ? "Add again" : "Record")}
    </Button>
  );

  const studentCell = (r: Row) => (
    <div className="flex items-center gap-2.5">
      <Avatar name={r.s.fullName} src={r.s.photo} size="sm" />
      <div className="min-w-0"><p className="truncate font-medium text-stone-900">{r.s.fullName}</p><p className="text-xs text-stone-500"><Ltr>{r.s.id}</Ltr></p></div>
    </div>
  );

  const columns: Column<Row>[] = [
    { key: "student", header: "Student", cell: studentCell, sort: (r) => r.s.fullName, text: (r) => `${r.s.fullName} (${r.s.id})` },
    { key: "class", header: "Class", cell: (r) => classLabel(r.cls), sort: (r) => classLabel(r.cls), text: (r) => classLabel(r.cls), hideBelow: "sm" },
    { key: "para", header: "Current Para", cell: (r) => fmtNum(r.s.hifz.currentPara), sort: (r) => r.s.hifz.currentPara, text: (r) => r.s.hifz.currentPara },
    { key: "surah", header: "Current Surah", cell: (r) => r.s.hifz.currentSurah || "—", text: (r) => r.s.hifz.currentSurah, hideBelow: "lg" },
    { key: "done", header: "Paras completed", cell: (r) => `${fmtNum(r.s.hifz.parasCompleted)} / 30`, sort: (r) => r.s.hifz.parasCompleted, text: (r) => r.s.hifz.parasCompleted, hideBelow: "md" },
    { key: "progress", header: "Progress", sort: (r) => r.progress, text: (r) => `${r.progress}%`, className: "min-w-28",
      cell: (r) => <div className="flex items-center gap-2"><ProgressBar value={r.progress} className="w-16 flex-1" /><span className="tabular text-xs">{r.progress}%</span></div> },
    { key: "sabaq", header: "Last Sabaq", cell: (r) => <span className="line-clamp-1 max-w-44">{r.s.hifz.dailyLesson || "—"}</span>, text: (r) => r.s.hifz.dailyLesson, hideBelow: "lg" },
    { key: "rev", header: "Revision status", cell: (r) => <StatusBadge status={r.rev} />, sort: (r) => r.rev, text: (r) => t(r.rev), hideBelow: "md" },
    { key: "date", header: "Last recorded", cell: (r) => fmtDate(r.last?.date), sort: (r) => r.last?.date ?? "", text: (r) => r.last?.date ?? "", hideBelow: "lg" },
    { key: "act", header: "Actions", align: "end", cell: (r) => recordBtn(r) || null },
  ];

  const card = (r: Row) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">{studentCell(r)}{recordBtn(r)}</div>
      <p className="text-xs text-stone-500">{classLabel(r.cls)} · {t("Para")} {r.s.hifz.currentPara} · {r.s.hifz.currentSurah}</p>
      <div className="flex items-center gap-2"><ProgressBar value={r.progress} className="flex-1" /><span className="tabular text-xs">{r.progress}%</span><StatusBadge status={r.rev} /></div>
    </div>
  );

  const quickColumns: Column<Row>[] = [
    { key: "student", header: "Student", cell: studentCell, sort: (r) => r.s.fullName },
    { key: "class", header: "Class", cell: (r) => classLabel(r.cls), hideBelow: "sm" },
    { key: "lesson", header: "Recent Sabaq", cell: (r) => r.s.hifz.dailyLesson || "—", hideBelow: "md" },
    { key: "act", header: "Actions", align: "end", cell: (r) => recordBtn(r) || null },
  ];

  return (
    <>
      <PageHeader title="Hifz Progress" description="Sabaq, Sabqi and Manzil records for every Hifz student." crumbs={[{ label: "Hifz Progress" }]}
        actions={canRecord && <Button size="lg" onClick={() => record()}><Plus className="size-4" />{t("Record progress")}</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Students in Hifz" value={fmtNum(stats.inProgress)} sub={t("{n} completed Hifz", { n: stats.completed })} icon={<BookOpen className="size-5" />} />
        <Stat label="Recorded today" value={fmtNum(stats.recordedToday)} sub={t("{n} still pending", { n: pending.length })} icon={<ClipboardCheck className="size-5" />} />
        <Stat label="Average progress" value={`${stats.avgProgress}%`} icon={<TrendingUp className="size-5" />} tone="gold" />
        <Stat label="Needs attention" value={fmtNum(stats.needsAttention)} icon={<TriangleAlert className="size-5" />} tone="red" />
        <Stat label="Total paras memorised" value={fmtNum(stats.totalParas)} icon={<Layers className="size-5" />} tone="blue" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Students by paras memorised" description="Number of students in each range of paras" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.buckets} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: CHART.axis }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART.axis }} />
              <Tooltip formatter={(v) => [v as number, t("Students")]} cursor={{ fill: "#f5f5f4" }} />
              <Bar dataKey="count" fill={CHART.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card>
          <CardHeader title={t("Average progress by class")} />
          <CardBody className="space-y-3">
            {classAvg.length === 0 && <p className="text-sm text-stone-500">{t("No records found")}</p>}
            {classAvg.map((c) => (
              <div key={c.cls?.id}>
                <div className="mb-1 flex justify-between text-sm"><span>{classLabel(c.cls)} <span className="text-xs text-stone-400">({c.n})</span></span><span className="tabular font-medium">{c.avg}%</span></div>
                <ProgressBar value={c.avg} />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[
        { id: "quick", label: "Quick record", badge: pending.length ? <span className="rounded-full bg-gold-100 px-1.5 text-xs text-gold-700">{pending.length}</span> : undefined, hidden: !canRecord },
        { id: "students", label: "All Hifz students" },
      ]} />

      {tab === "quick" && canRecord ? (
        <DataTable columns={quickColumns} rows={pending} rowKey={(r) => r.s.id} pageSize={10} searchText={(r) => `${r.s.fullName} ${r.s.id}`}
          renderCard={card} onRowClick={(r) => setDetail(r.s.id)}
          empty={{ title: "All caught up", description: "Every Hifz student has a record for today." }} />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.s.id} pageSize={10} exportName="hifz-progress"
          searchText={(r) => `${r.s.fullName} ${r.s.id} ${r.s.hifz.currentSurah}`} searchPlaceholder="Search student, ID or surah…"
          renderCard={card} onRowClick={(r) => setDetail(r.s.id)}
          toolbar={<>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto" aria-label={t("Class")}>
              <option value="">{t("All classes")}</option>{scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label={t("Status")}>
              <option value="">{t("All statuses")}</option>{["In Progress", "Completed"].map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </Select>
            <Select value={rev} onChange={(e) => setRev(e.target.value)} className="w-auto" aria-label={t("Revision status")}>
              <option value="">{t("All revision statuses")}</option>{["Regular", "Needs attention", "No recent record"].map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </Select>
          </>} />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} size="xl" title={rows.find((r) => r.s.id === detail)?.s.fullName ?? ""}
        footer={detail && can("students.view") ? <LinkButton href={`/students/${detail}`} variant="secondary">{t("View profile")}</LinkButton> : undefined}>
        {detail && <HifzProgressPanel studentId={detail} />}
      </Modal>
      <HifzEntryDialog open={dialog.open} onClose={() => setDialog({ open: false })} studentId={dialog.studentId} />
    </>
  );
}

