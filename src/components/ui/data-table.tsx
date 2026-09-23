"use client";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Printer, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PrintSheet, PrintTable, usePrint } from "@/components/print/print";
import { useI18n } from "@/lib/i18n";
import { cn, downloadFile, toCSV } from "@/lib/utils";
import { Button } from "./button";
import { Card } from "./card";
import { Input, Select } from "./form";
import { EmptyState, ErrorState, Skeleton } from "./misc";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Enables click-to-sort on this column. */
  sort?: (row: T) => string | number;
  /** Plain-text value used for CSV export and printing. Columns without it are skipped. */
  text?: (row: T) => string | number;
  className?: string;
  align?: "start" | "end" | "center";
  /** Hide this column below the given breakpoint (mobile-friendly tables). */
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** Text searched by the built-in search box. Omit to hide the box. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Filters/selects rendered beside the search box. */
  toolbar?: ReactNode;
  /** Enables Export CSV + Print buttons; also used as the printed title. */
  exportName?: string;
  exportSubtitle?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Compact card layout for phones (below md). Falls back to the table when omitted. */
  renderCard?: (row: T) => ReactNode;
  loading?: boolean;
  error?: string;
  empty?: { title?: string; description?: string; action?: ReactNode };
  defaultSort?: { key: string; dir: "asc" | "desc" };
  footer?: ReactNode;
  className?: string;
}

const hide = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", "2xl": "hidden 2xl:table-cell" };

/** The one table used across the app: search, sort, pagination, CSV export and print built in. */
export function DataTable<T>({
  columns, rows, rowKey, pageSize = 10, searchText, searchPlaceholder, toolbar, exportName, exportSubtitle, onRowClick,
  renderCard, loading, error, empty, defaultSort, footer, className,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const print = usePrint();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(needle)) : rows;
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) {
      const f = col.sort, dir = sort!.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = f(a), y = f(b);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
      });
    }
    return out;
  }, [rows, q, sort, searchText, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  useEffect(() => { setPage(1); }, [q, rows.length, size]);
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * size, current * size);
  const exportCols = columns.filter((c) => c.text);

  const doExport = () => downloadFile(`${exportName}.csv`, toCSV(exportCols.map((c) => t(c.header)), filtered.map((r) => exportCols.map((c) => c.text!(r)))));
  const doPrint = () =>
    print(
      <PrintSheet title={exportName ?? ""} subtitle={exportSubtitle}>
        <PrintTable headers={exportCols.map((c) => c.header)} rows={filtered.map((r) => exportCols.map((c) => c.text!(r)))} />
        <p className="mt-2 text-[11px]">{t("Total: {n}", { n: filtered.length })}</p>
      </PrintSheet>,
    );

  const toggleSort = (c: Column<T>) => {
    if (!c.sort) return;
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }));
  };

  const showBar = !!searchText || !!toolbar || !!exportName;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {showBar && (
        <div className="no-print flex flex-wrap items-center gap-2 border-b border-stone-100 p-3 sm:p-4">
          {searchText && (
            <div className="relative min-w-0 flex-1 basis-56">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(searchPlaceholder ?? "Search")} className="ps-9" aria-label={t("Search")} />
            </div>
          )}
          {toolbar}
          {exportName && exportCols.length > 0 && (
            <div className="ms-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={doExport} disabled={!filtered.length}><Download className="size-4" />{t("Export CSV")}</Button>
              <Button variant="secondary" size="sm" onClick={doPrint} disabled={!filtered.length}><Printer className="size-4" />{t("Print")}</Button>
            </div>
          )}
        </div>
      )}

      {error ? <ErrorState message={error} />
        : loading ? <div className="space-y-3 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        : filtered.length === 0 ? <EmptyState title={empty?.title ?? (rows.length ? "No records found" : undefined)} description={empty?.description ?? (rows.length ? "Try changing or clearing the filters." : undefined)} action={empty?.action} />
        : (
          <>
            {renderCard && <ul className="divide-y divide-stone-100 md:hidden">{visible.map((r) => (
              <li key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn("p-3", onRowClick && "cursor-pointer active:bg-stone-50")}>{renderCard(r)}</li>
            ))}</ul>}
            <div className={cn("scroll-thin overflow-x-auto", renderCard && "hidden md:block")}>
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} scope="col" className={cn("whitespace-nowrap px-3 py-2.5 font-semibold", c.align === "end" ? "text-end" : c.align === "center" ? "text-center" : "text-start", c.hideBelow && hide[c.hideBelow], c.className)}>
                        {c.sort ? (
                          <button className="inline-flex items-center gap-1 uppercase hover:text-stone-900" onClick={() => toggleSort(c)}>
                            {t(c.header)}
                            {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                          </button>
                        ) : t(c.header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {visible.map((r) => (
                    <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn("hover:bg-stone-50/70", onRowClick && "cursor-pointer")}>
                      {columns.map((c) => (
                        <td key={c.key} className={cn("px-3 py-2.5 align-middle text-stone-700", c.align === "end" ? "whitespace-nowrap text-end" : c.align === "center" ? "text-center" : "text-start", c.hideBelow && hide[c.hideBelow], c.className)}>{c.cell(r)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {footer}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-3 py-2.5 text-sm text-stone-600 sm:px-4">
              <span>{t("Showing {from}–{to} of {total}", { from: (current - 1) * size + 1, to: Math.min(current * size, filtered.length), total: filtered.length })}</span>
              <div className="flex items-center gap-2">
                <Select value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 w-auto py-0 text-sm sm:h-8" aria-label={t("Rows per page")}>
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
                <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label={t("Previous")}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
                <span className="tabular whitespace-nowrap">{t("Page {page} of {pages}", { page: current, pages })}</span>
                <Button variant="secondary" size="sm" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label={t("Next")}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
              </div>
            </div>
          </>
        )}
    </Card>
  );
}
