"use client";
import { BookOpen, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { CHART } from "@/components/charts/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Ltr, ProgressBar } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { revisionStatus, studentHifz } from "@/lib/services/hifz";
import { getStudent, hifzProgressPercent } from "@/lib/services/students";
import { HifzEntryDialog } from "./hifz-entry-dialog";

const QUALITY_SCORE = { Excellent: 4, Good: 3, Average: 2, Weak: 1 } as const;

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-xs text-stone-500">{t(label)}</p>
      <div className="mt-1 text-base font-semibold text-stone-900">{children}</div>
    </div>
  );
}

/** Everything about one student's Hifz: summary, 30-para grid, trend chart and timeline. */
export function HifzProgressPanel({ studentId }: { studentId: string }) {
  const { t, fmtDate, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const student = getStudent(scoped, studentId);
  const records = useMemo(() => studentHifz(scoped, studentId), [scoped, studentId]);
  const chartData = useMemo(
    () => records.slice(0, 20).reverse().map((r) => ({ date: r.date.slice(5), mistakes: r.mistakes, quality: QUALITY_SCORE[r.quality] })),
    [records],
  );
  const teacherName = (id: string) => scoped.teachers.find((x) => x.id === id)?.name ?? "—";

  if (!student) return <EmptyState title="Student not found" />;
  const h = student.hifz;
  const progress = hifzProgressPercent(student);
  const canRecord = can("hifz.record");
  const addBtn = canRecord && (
    <Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("Add progress")}</Button>
  );

  if (h.status === "Not Started" && !records.length) {
    return (
      <Card>
        <EmptyState icon={<BookOpen className="size-6" />} title="Hifz has not started" description="Record the first lesson to begin tracking Hifz progress for this student." action={addBtn || undefined} />
        <HifzEntryDialog open={adding} onClose={() => setAdding(false)} studentId={studentId} />
      </Card>
    );
  }

  const shown = showAll ? records : records.slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><StatusBadge status={h.status} /><span className="text-sm text-stone-500">{h.startDate && `${t("Started")} ${fmtDate(h.startDate)}`}</span></div>
        {addBtn}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="Current Para">{fmtNum(h.currentPara)}</Tile>
        <Tile label="Total paras completed">{fmtNum(h.parasCompleted)} / 30</Tile>
        <Tile label="Current Surah">{h.currentSurah || "—"}</Tile>
        <Tile label="Recent Sabaq"><span className="text-sm font-medium">{h.dailyLesson || "—"}</span></Tile>
        <Tile label="Revision status"><StatusBadge status={revisionStatus(records)} /></Tile>
        <Tile label="Progress"><span className="tabular">{progress}%</span><ProgressBar value={progress} className="mt-2" /></Tile>
      </div>

      <Card>
        <CardHeader title={t("Para progress")} description={t("{n} of 30 paras memorised", { n: h.parasCompleted })} />
        <CardBody>
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2" dir="ltr">
            {Array.from({ length: 30 }, (_, i) => {
              const p = i + 1;
              const current = p === h.currentPara && h.status !== "Completed";
              const done = p <= h.parasCompleted && !current;
              return (
                <div key={p} title={`${t("Para")} ${p}`}
                  className={`flex aspect-square items-center justify-center rounded-md text-xs font-medium ${current ? "bg-gold-500 text-white ring-2 ring-gold-100" : done ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-500"}`}>
                  {p}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded bg-brand-700" />{t("Completed")}</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded bg-gold-500" />{t("Current para")}</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded bg-stone-200" />{t("Pending")}</span>
          </div>
        </CardBody>
      </Card>

      {chartData.length > 1 && (
        <ChartCard title="Mistakes and quality over time" description="Last 20 lessons" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART.axis }} />
              <YAxis yAxisId="m" allowDecimals={false} tick={{ fontSize: 11, fill: CHART.axis }} />
              <YAxis yAxisId="q" orientation="right" domain={[0, 4]} ticks={[1, 2, 3, 4]} tick={{ fontSize: 11, fill: CHART.axis }} />
              <Tooltip formatter={(v, name) => [v as number, t(String(name))]} />
              <Bar yAxisId="m" dataKey="mistakes" name="Mistakes" fill={CHART.greenLight} radius={[3, 3, 0, 0]} />
              <Line yAxisId="q" dataKey="quality" name="Quality (1–4)" stroke={CHART.gold} strokeWidth={2} dot={{ r: 2 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <Card>
        <CardHeader title={t("Progress timeline")} description={t("{n} records", { n: records.length })} />
        <CardBody>
          {records.length === 0 ? <p className="text-sm text-stone-500">{t("No records found")}</p> : (
            <ol className="relative space-y-4 border-s-2 border-brand-100 ps-5">
              {shown.map((r) => (
                <li key={r.id} className="relative">
                  <span className="absolute -start-[1.6rem] top-1.5 size-3 rounded-full border-2 border-white bg-brand-600" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">{fmtDate(r.date)}</span>
                    <span className="text-sm text-stone-600">{t("Para")} {r.para} · {r.surah} · <Ltr>{r.ayahFrom}–{r.ayahTo}</Ltr></span>
                    <StatusBadge status={r.quality} />
                    {r.paraCompleted && <Badge tone="gold">{t("Para completed")}</Badge>}
                  </div>
                  <dl className="mt-1.5 grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-stone-500">{t("Sabaq")}</dt><dd>{r.sabaq || "—"}</dd></div>
                    <div><dt className="text-xs text-stone-500">{t("Sabqi")}</dt><dd>{r.sabqi || "—"}</dd></div>
                    <div><dt className="text-xs text-stone-500">{t("Manzil")}</dt><dd>{r.manzil || "—"}</dd></div>
                  </dl>
                  <p className="mt-1 text-xs text-stone-500">
                    {t("Mistakes")}: <Ltr>{r.mistakes}</Ltr>{r.assessment && <> · {r.assessment}</>} · {teacherName(r.teacherId)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {records.length > 8 && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll((s) => !s)}>{showAll ? t("Show less") : t("Show all records")}</Button>
          )}
        </CardBody>
      </Card>
      <HifzEntryDialog open={adding} onClose={() => setAdding(false)} studentId={studentId} />
    </div>
  );
}
