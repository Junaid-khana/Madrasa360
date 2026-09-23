"use client";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, FileDown, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PrintSheet, PrintTable, usePrint } from "@/components/print/print";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/feedback";
import { EmptyState, Ltr } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classLabel } from "@/lib/services/students";
import { addMonths, cn, downloadFile, monthOf, todayISO, toCSV } from "@/lib/utils";
import { EMPTY_FILTERS, REPORTS, reportById, type ReportFilters, type ReportResult } from "./definitions";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ReportsPage() {
  const { t, fmtNum, fmtMoney, fmtDate, fmtMonth } = useI18n();
  const { scoped, can } = useAuth();
  const toast = useToast();
  const print = usePrint();
  const params = useSearchParams();

  const available = REPORTS.filter((r) => can(r.perm));
  const [id, setId] = useState(() => available.find((r) => r.id === params.get("report"))?.id ?? available[0]?.id ?? "");
  const def = available.find((r) => r.id === id) ?? available[0];
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const size = 25;

  // Reset filters (with report-specific defaults) whenever the report changes.
  useEffect(() => {
    if (!def) return;
    setFilters({ ...EMPTY_FILTERS, ...def.defaults?.(todayISO()) });
    setSort(null); setPage(1);
  }, [def]);
  useEffect(() => { setPage(1); }, [filters, sort]);

  const result: ReportResult | null = useMemo(() => (def ? def.build(scoped, filters) : null), [def, scoped, filters]);

  const sortedRows = useMemo(() => {
    if (!result) return [];
    if (!sort) return result.rows;
    return [...result.rows].sort((a, b) => {
      const x = a[sort.col], y = b[sort.col];
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sort.dir;
    });
  }, [result, sort]);

  if (!def || !result) return <EmptyState title="Access denied" description="You do not have permission to open this page." />;

  const set = (k: keyof ReportFilters, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const months = Array.from({ length: 12 }, (_, i) => addMonths(monthOf(todayISO()), -i));
  const statusOptions = def.statusOptions?.(scoped) ?? [];

  const cell = (v: string | number, col: number) => {
    if (typeof v === "number") return result.money?.includes(col) ? fmtMoney(v) : fmtNum(v);
    if (ISO.test(v)) return fmtDate(v);
    if (/^[A-Z]{2,4}-[\d-]+$/.test(v) || /^0\d{3}-\d{7}$/.test(v)) return v; // IDs, receipt numbers, phones
    return t(v);
  };
  const isCode = (v: string | number) => typeof v === "string" && (/^[A-Z]{2,4}-[\d-]+$/.test(v) || /^0\d{3}-\d{7}$/.test(v));
  const textCell = (v: string | number, col: number) => (typeof v === "number" ? (result.money?.includes(col) ? fmtMoney(v) : fmtNum(v)) : ISO.test(v) ? fmtDate(v) : isCode(v) ? v : t(v));

  const filterSummary = () => {
    const p: string[] = [];
    if (def.filters.includes("dateRange") && (filters.from || filters.to)) p.push(`${t("From")} ${filters.from ? fmtDate(filters.from) : "…"} ${t("To")} ${filters.to ? fmtDate(filters.to) : "…"}`);
    if (filters.month) p.push(`${t("Month")}: ${fmtMonth(filters.month)}`);
    if (filters.classId) p.push(`${t("Class")}: ${classLabel(scoped.classes.find((c) => c.id === filters.classId))}`);
    if (filters.gender) p.push(`${t("Gender")}: ${t(filters.gender)}`);
    if (filters.status) p.push(`${t(def.statusLabel ?? "Status")}: ${t(filters.status)}`);
    if (filters.q) p.push(`${t("Search")}: “${filters.q}”`);
    return p.join("  •  ") || t("All records");
  };

  const summaryText = (s: ReportResult["summary"] = []) => s.map((x) => `${t(x.label)}: ${typeof x.value === "number" ? (x.money ? fmtMoney(x.value) : fmtNum(x.value)) : t(String(x.value))}`);

  const doPrint = (pdf: boolean) => {
    if (pdf) toast.info(t("In the print window, choose “Save as PDF” as the printer."));
    print(
      <PrintSheet title={def.title} subtitle={filterSummary()}>
        {result.summary && <p className="mb-2 text-[11px] font-medium">{summaryText(result.summary).join("   |   ")}</p>}
        <PrintTable headers={result.columns} rows={sortedRows.map((r) => r.map((v, c) => textCell(v, c)))} />
      </PrintSheet>,
    );
  };
  const doCsv = () => {
    downloadFile(`${def.id}-${todayISO()}.csv`, toCSV(result.columns.map((c) => t(c)), sortedRows));
    toast.success(t("Saved successfully"));
  };

  const pages = Math.max(1, Math.ceil(sortedRows.length / size));
  const cur = Math.min(page, pages);
  const visible = sortedRows.slice((cur - 1) * size, cur * size);
  const has = (k: string) => def.filters.includes(k as never);

  return (
    <>
      <PageHeader
        title="Reports" description="Choose a report, apply filters, then print or export it." crumbs={[{ label: "Reports" }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => doPrint(false)} disabled={!sortedRows.length}><Printer className="size-4" />{t("Print")}</Button>
            <Button variant="secondary" onClick={() => doPrint(true)} disabled={!sortedRows.length}><FileDown className="size-4" />{t("Export PDF")}</Button>
            <Button onClick={doCsv} disabled={!sortedRows.length}><Download className="size-4" />{t("Export CSV")}</Button>
          </>
        }
      />

      <div className="no-print grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {available.map((r) => (
          <button
            key={r.id} onClick={() => setId(r.id)} aria-pressed={r.id === def.id}
            className={cn("rounded-xl border p-3 text-start transition-colors", r.id === def.id ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-stone-200 bg-white hover:border-brand-300")}
          >
            <span className={cn("block text-sm font-semibold", r.id === def.id ? "text-brand-900" : "text-stone-800")}>{t(r.title)}</span>
            <span className="mt-0.5 hidden text-xs text-stone-500 md:block">{t(r.description)}</span>
          </button>
        ))}
      </div>

      <Card className="no-print mt-4">
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {has("dateRange") && <>
            <Field label={t("From")}><Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)} /></Field>
            <Field label={t("To")}><Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} /></Field>
          </>}
          {has("month") && (
            <Field label={t("Month")}>
              <Select value={filters.month} onChange={(e) => set("month", e.target.value)}>
                <option value="">{t("All")}</option>
                {months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
              </Select>
            </Field>
          )}
          {has("class") && (
            <Field label={t("Class")}>
              <Select value={filters.classId} onChange={(e) => set("classId", e.target.value)}>
                <option value="">{t("All")}</option>
                {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </Select>
            </Field>
          )}
          {has("gender") && (
            <Field label={t("Gender")}>
              <Select value={filters.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">{t("All")}</option>
                <option value="Male">{t("Male")}</option>
                <option value="Female">{t("Female")}</option>
              </Select>
            </Field>
          )}
          {has("status") && (
            <Field label={t(def.statusLabel ?? "Status")}>
              <Select value={filters.status} onChange={(e) => set("status", e.target.value)}>
                <option value="">{t(def.id === "exams" ? "Latest exam" : "All")}</option>
                {statusOptions.map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </Select>
            </Field>
          )}
          {has("search") && <Field label={t("Search")}><Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder={t("Name, ID or phone")} /></Field>}
          <div className="flex items-end"><Button variant="ghost" onClick={() => setFilters({ ...EMPTY_FILTERS, ...def.defaults?.(todayISO()) })}>{t("Clear filters")}</Button></div>
        </CardBody>
      </Card>

      {result.summary && (
        <div className="no-print mt-4 flex flex-wrap gap-2">
          {result.summary.map((s) => (
            <div key={s.label} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <p className="text-xs text-stone-500">{t(s.label)}</p>
              <p className="text-base font-semibold tabular text-stone-900">{typeof s.value === "number" ? (s.money ? fmtMoney(s.value) : fmtNum(s.value)) : t(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      <Card className="no-print mt-4 overflow-hidden">
        {sortedRows.length === 0 ? <EmptyState title="No records found" description="Try changing or clearing the filters." /> : (
          <>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    {result.columns.map((c, i) => (
                      <th key={c} scope="col" className="whitespace-nowrap px-3 py-2.5 text-start font-semibold">
                        <button className="inline-flex items-center gap-1 uppercase hover:text-stone-900" onClick={() => setSort((s) => (s?.col === i ? { col: i, dir: s.dir === 1 ? -1 : 1 } : { col: i, dir: 1 }))}>
                          {t(c)}{sort?.col === i && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {visible.map((r, ri) => (
                    <tr key={ri} className={cn("hover:bg-stone-50/70", r[0] === "Total" && "bg-stone-50 font-semibold")}>
                      {r.map((v, c) => (
                        <td key={c} className="whitespace-nowrap px-3 py-2.5 text-stone-700">{isCode(v) || typeof v === "number" ? <Ltr>{cell(v, c)}</Ltr> : cell(v, c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-2.5 text-sm text-stone-600">
              <span>{t("Showing {from}–{to} of {total}", { from: (cur - 1) * size + 1, to: Math.min(cur * size, sortedRows.length), total: sortedRows.length })}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label={t("Previous")}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
                <span className="tabular">{t("Page {page} of {pages}", { page: cur, pages })}</span>
                <Button variant="secondary" size="sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)} aria-label={t("Next")}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
