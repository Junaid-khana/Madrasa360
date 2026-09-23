"use client";
import { Eye, HandHeart, Plus, Printer, Trash2, Users, CalendarDays, Coins } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { CHART } from "@/components/charts/theme";
import { PrintSheet, PrintTable, usePrint } from "@/components/print/print";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { Ltr, Stat } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { useActor, useAuth } from "@/lib/auth/auth";
import { DONATION_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { deleteDonation } from "@/lib/services/donations";
import type { Donation } from "@/lib/types";
import { monthOf, sum, todayISO } from "@/lib/utils";
import { DonationDialog } from "./donation-dialog";
import { DonationReceiptModal } from "./donation-receipt";

export function DonationsPage() {
  const { t, fmtMoney, fmtDate, fmtNum } = useI18n();
  const { scoped: db, user } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const print = usePrint();
  const params = useSearchParams();
  const [adding, setAdding] = useState(params.get("add") === "1");
  const [viewing, setViewing] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const today = todayISO(), month = monthOf(today), year = today.slice(0, 4);
  const stats = useMemo(() => {
    const ytd = db.donations.filter((d) => d.date.startsWith(year));
    return {
      month: sum(db.donations.filter((d) => monthOf(d.date) === month).map((d) => d.amount)),
      today: sum(db.donations.filter((d) => d.date === today).map((d) => d.amount)),
      ytd: sum(ytd.map((d) => d.amount)),
      donors: new Set(ytd.map((d) => d.donorName.trim().toLowerCase())).size,
      byCategory: DONATION_CATEGORIES.map((c) => ({ name: t(c), total: sum(ytd.filter((d) => d.category === c).map((d) => d.amount)) })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total),
    };
  }, [db.donations, month, today, year, t]);

  const rows = useMemo(() => [...db.donations].sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo.localeCompare(a.receiptNo)).filter((d) =>
    (!category || d.category === category) && (!method || d.method === method) && (!from || d.date >= from) && (!to || d.date <= to)), [db.donations, category, method, from, to]);

  const summary = useMemo(() => DONATION_CATEGORIES.map((c) => {
    const list = rows.filter((d) => d.category === c);
    return { category: c, count: list.length, total: sum(list.map((d) => d.amount)) };
  }).filter((s) => s.count > 0), [rows]);
  const grandTotal = sum(summary.map((s) => s.total));

  const remove = async (d: Donation) => {
    if (!(await confirm({ title: "Delete this donation?", message: "This removes the record permanently. It cannot be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
    deleteDonation(d.id, actor);
    toast.success(t("Donation deleted"));
  };

  const printSummary = () => print(
    <PrintSheet title="Donation Report" subtitle={from || to ? `${from ? fmtDate(from) : "…"} – ${to ? fmtDate(to) : "…"}` : t("All dates")}>
      <PrintTable headers={["Category", "Donations", "Total"]}
        rows={[...summary.map((s) => [t(s.category), fmtNum(s.count), <span key="t" className="block text-end tabular">{fmtMoney(s.total)}</span>]),
          [<b key="a">{t("Total")}</b>, <b key="b">{fmtNum(sum(summary.map((s) => s.count)))}</b>, <b key="c" className="block text-end tabular">{fmtMoney(grandTotal)}</b>]]} />
      <PrintTable className="mt-5" headers={["Receipt No", "Date", "Donor", "Category", "Method", "Amount"]}
        rows={rows.map((d) => [d.receiptNo, fmtDate(d.date), d.donorName, t(d.category), t(d.method), <span key="a" className="block text-end tabular">{fmtMoney(d.amount)}</span>])} />
    </PrintSheet>,
  );

  const columns: Column<Donation>[] = [
    { key: "no", header: "Receipt No", hideBelow: "md", sort: (d) => d.receiptNo, text: (d) => d.receiptNo, cell: (d) => <Ltr>{d.receiptNo}</Ltr> },
    { key: "date", header: "Date", sort: (d) => d.date, text: (d) => d.date, cell: (d) => fmtDate(d.date) },
    { key: "donor", header: "Donor", sort: (d) => d.donorName, text: (d) => d.donorName, cell: (d) => <span className="font-medium text-stone-900">{d.donorName}</span> },
    { key: "phone", header: "Phone", hideBelow: "lg", text: (d) => d.phone, cell: (d) => d.phone ? <Ltr>{d.phone}</Ltr> : "—" },
    { key: "category", header: "Category", hideBelow: "sm", sort: (d) => d.category, text: (d) => t(d.category), cell: (d) => t(d.category) },
    { key: "method", header: "Method", hideBelow: "lg", text: (d) => t(d.method), cell: (d) => t(d.method) },
    { key: "purpose", header: "Purpose", hideBelow: "lg", text: (d) => d.purpose, cell: (d) => <span className="line-clamp-1 max-w-52">{d.purpose || "—"}</span> },
    { key: "amount", header: "Amount", align: "end", sort: (d) => d.amount, text: (d) => d.amount, cell: (d) => <span className="font-semibold tabular">{fmtMoney(d.amount)}</span> },
    { key: "actions", header: "Actions", align: "end", cell: (d) => (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <IconButton label={t("View receipt")} onClick={() => setViewing(d.id)}><Eye className="size-4" /></IconButton>
        {user?.role === "super_admin" && <IconButton label={t("Delete")} onClick={() => remove(d)} className="text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></IconButton>}
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Donations" description="Record donations, print receipts and see totals by category." crumbs={[{ label: "Donations" }]}
        actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("Add Donation")}</Button>} />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Donations This Month" value={fmtMoney(stats.month)} icon={<HandHeart className="size-5" />} />
        <Stat label="Today" value={fmtMoney(stats.today)} icon={<CalendarDays className="size-5" />} tone="gold" />
        <Stat label="Year to date" value={fmtMoney(stats.ytd)} icon={<Coins className="size-5" />} />
        <Stat label="Donors this year" value={stats.donors} icon={<Users className="size-5" />} tone="blue" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Donations by category (this year)" height={Math.max(200, stats.byCategory.length * 38 + 30)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byCategory} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: CHART.axis, fontSize: 12 }} />
              <Tooltip formatter={(v) => fmtMoney(Number(v))} cursor={{ fill: "#f5f5f4" }} />
              <Bar dataKey="total" fill={CHART.green} radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader title={t("Donation summary")} description={t("Based on the filters below")}
            action={<Button size="sm" variant="secondary" onClick={printSummary} disabled={!rows.length}><Printer className="size-4" />{t("Print")}</Button>} />
          <CardBody>
            {summary.length === 0 ? <p className="py-6 text-center text-sm text-stone-500">{t("No records found")}</p> : (
              <table className="w-full text-sm">
                <thead className="text-xs text-stone-500"><tr><th className="pb-2 text-start font-medium">{t("Category")}</th><th className="pb-2 text-end font-medium">{t("Donations")}</th><th className="pb-2 text-end font-medium">{t("Total")}</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {summary.map((s) => <tr key={s.category}><td className="py-1.5">{t(s.category)}</td><td className="py-1.5 text-end tabular">{fmtNum(s.count)}</td><td className="py-1.5 text-end tabular">{fmtMoney(s.total)}</td></tr>)}
                  <tr className="font-semibold"><td className="pt-2">{t("Total")}</td><td className="pt-2 text-end tabular">{fmtNum(sum(summary.map((s) => s.count)))}</td><td className="pt-2 text-end tabular">{fmtMoney(grandTotal)}</td></tr>
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(d) => d.id} exportName="donations" onRowClick={(d) => setViewing(d.id)}
        searchText={(d) => `${d.donorName} ${d.phone} ${d.receiptNo} ${d.purpose}`} searchPlaceholder="Search donor, phone or receipt…"
        defaultSort={{ key: "date", dir: "desc" }}
        toolbar={<>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto" aria-label={t("Category")}>
            <option value="">{t("All")} · {t("Category")}</option>
            {DONATION_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </Select>
          <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-auto" aria-label={t("Method")}>
            <option value="">{t("All")} · {t("Method")}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label={t("From")} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label={t("To")} />
        </>}
        renderCard={(d) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="truncate font-medium text-stone-900">{d.donorName}</p><p className="truncate text-xs text-stone-500">{t(d.category)} · {fmtDate(d.date)}</p></div>
            <span className="shrink-0 font-semibold tabular">{fmtMoney(d.amount)}</span>
          </div>
        )}
        empty={{ title: "No donations yet", description: "Record the first donation with the “Add Donation” button." }}
      />

      <DonationDialog open={adding} onClose={() => setAdding(false)} onSaved={setViewing} />
      {viewing && <DonationReceiptModal donationId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
