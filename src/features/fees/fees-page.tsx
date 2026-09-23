"use client";
import { CalendarPlus, Coins, CircleAlert, HandCoins, Plus, Users, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ProgressBar, Stat } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { financeStats } from "@/lib/services/fees";
import { pct } from "@/lib/utils";
import { ChargeDialog } from "./charge-dialog";
import { CollectFeeDialog } from "./collect-fee-dialog";
import { FeeRecordsTab } from "./fee-records-tab";
import { GenerateFeesDialog } from "./generate-dialog";
import { OutstandingTab } from "./outstanding-tab";
import { ReceiptsTab } from "./receipts-tab";

export function FeesPage() {
  const { t, fmtMoney } = useI18n();
  const { can, scoped } = useAuth();
  const params = useSearchParams();
  const manage = can("fees.manage");
  const [tab, setTab] = useState("records");
  const [collect, setCollect] = useState<{ open: boolean; studentId?: string }>({
    open: params.get("collect") === "1", studentId: params.get("student") ?? undefined,
  });
  const [charge, setCharge] = useState(false);
  const [generate, setGenerate] = useState(false);
  const stats = useMemo(() => financeStats(scoped), [scoped]);
  const collectedPct = pct(Math.min(stats.monthCollection, stats.monthBilled), stats.monthBilled);
  const openCollect = (studentId?: string) => setCollect({ open: true, studentId });

  return (
    <>
      <PageHeader
        title="Fees" description="Collect fees, print receipts and follow up on unpaid balances." crumbs={[{ label: "Fees" }]}
        actions={manage && <>
          <Button variant="secondary" onClick={() => setGenerate(true)}><CalendarPlus className="size-4" />{t("Generate monthly fees")}</Button>
          <Button variant="secondary" onClick={() => setCharge(true)}><Plus className="size-4" />{t("Add charge")}</Button>
          <Button onClick={() => openCollect()}><HandCoins className="size-4" />{t("Collect Fee")}</Button>
        </>}
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today's collection" value={fmtMoney(stats.todayCollection)} icon={<Wallet className="size-5" />} />
        <Stat label="This month's collection" value={fmtMoney(stats.monthCollection)} icon={<Coins className="size-5" />} />
        <Stat label="Outstanding amount" value={fmtMoney(stats.outstanding)} icon={<CircleAlert className="size-5" />} tone="red" />
        <Stat label="Unpaid students" value={stats.unpaidStudents} icon={<Users className="size-5" />} tone="gold" />
      </div>
      <Card className="mb-5">
        <CardBody className="py-3 sm:py-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-stone-800">{t("This month: collected vs billed")}</span>
            <span className="text-stone-600 tabular">{fmtMoney(stats.monthCollection)} / {fmtMoney(stats.monthBilled)} ({collectedPct}%)</span>
          </div>
          <ProgressBar value={collectedPct} />
        </CardBody>
      </Card>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { id: "records", label: "Fee Records" }, { id: "receipts", label: "Receipts" }, { id: "outstanding", label: "Outstanding" },
      ]} />
      {tab === "records" && <FeeRecordsTab onCollect={openCollect} />}
      {tab === "receipts" && <ReceiptsTab />}
      {tab === "outstanding" && <OutstandingTab onCollect={openCollect} />}

      <CollectFeeDialog key={collect.studentId ?? "any"} open={collect.open} studentId={collect.studentId} onClose={() => setCollect({ open: false })} />
      <ChargeDialog open={charge} onClose={() => setCharge(false)} />
      <GenerateFeesDialog open={generate} onClose={() => setGenerate(false)} />
    </>
  );
}
