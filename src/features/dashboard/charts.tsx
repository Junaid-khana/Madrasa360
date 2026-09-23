"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { CHART, CHART_MARGIN, GENDER_COLORS } from "@/components/charts/theme";
import { useI18n } from "@/lib/i18n";
import type { DashboardData } from "./data";

const tick = { fontSize: 12, fill: CHART.axis };
const tooltipStyle = { borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,.08)" };

export function DistributionChart({ data }: { data: DashboardData["perClass"] }) {
  const { t } = useI18n();
  const rows = data.map((d) => ({ ...d, name: d.name.replace("Dars-e-Nizami Basic", "D. Nizami") }));
  return (
    <ChartCard title="Student distribution by class" height={340}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" tick={tick} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={tick} width={92} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }} />
          <Legend formatter={(v) => t(v === "Male" ? "Boys" : "Girls")} />
          <Bar dataKey="Male" stackId="a" fill={GENDER_COLORS.Male} name="Male" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Female" stackId="a" fill={GENDER_COLORS.Female} name="Female" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AttendanceTrendChart({ data }: { data: DashboardData["trend"] }) {
  const { fmtDate, t } = useI18n();
  const rows = data.map((d) => ({ ...d, label: fmtDate(d.date).split(" ").slice(0, 2).join(" ") }));
  return (
    <ChartCard title="Attendance trend (last 14 days)" height={260}>
      {rows.length === 0 ? <p className="flex h-full items-center justify-center text-sm text-stone-500">{t("Attendance not yet marked")}</p> : (
        <ResponsiveContainer>
          <LineChart data={rows} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" />
            <YAxis domain={[60, 100]} tick={tick} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, t("Present")]} />
            <Line type="monotone" dataKey="percent" stroke={CHART.green} strokeWidth={2.5} dot={{ r: 3, fill: CHART.green }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function FeeCollectionChart({ data }: { data: DashboardData["feeMonths"] }) {
  const { fmtMonth, fmtMoney, t } = useI18n();
  const rows = data.map((d) => ({ ...d, label: fmtMonth(d.month).split(" ")[0].slice(0, 3) }));
  return (
    <ChartCard title="Monthly fee collection" height={260}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={CHART_MARGIN} barGap={2}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={tick} />
          <YAxis tick={tick} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }} formatter={(v, n) => [fmtMoney(Number(v)), t(String(n))]} />
          <Legend formatter={(v) => t(String(v))} />
          <Bar dataKey="Billed" fill={CHART.greenLight} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Collected" fill={CHART.green} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HifzBucketsChart({ data }: { data: { label: string; count: number }[] }) {
  const { t } = useI18n();
  return (
    <ChartCard title="Hifz progress (paras memorised)" height={260}>
      <ResponsiveContainer>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={tick} label={{ value: t("Paras"), position: "insideBottom", offset: -2, fontSize: 11, fill: CHART.axis }} height={36} />
          <YAxis tick={tick} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }} formatter={(v) => [v, t("Students")]} />
          <Bar dataKey="count" fill={CHART.gold} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EnrollmentChart({ data }: { data: DashboardData["enrollment"] }) {
  const { fmtMonth, t } = useI18n();
  const rows = data.map((d) => ({ ...d, label: fmtMonth(d.month).split(" ")[0].slice(0, 3) }));
  const min = Math.max(0, Math.min(...rows.map((r) => r.students)) - 5);
  return (
    <ChartCard title="Student enrollment" height={260}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="enr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.green} stopOpacity={0.25} /><stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={tick} />
          <YAxis tick={tick} domain={[min, "auto"]} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, t("Enrolled")]} />
          <Area type="monotone" dataKey="students" stroke={CHART.green} strokeWidth={2.5} fill="url(#enr)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
