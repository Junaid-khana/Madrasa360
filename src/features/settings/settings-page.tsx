"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth";
import { AcademicTab } from "./academic-tab";
import { CommunicationTab } from "./communication-tab";
import { DataTab } from "./data-tab";
import { FeesTab } from "./fees-tab";
import { InfoTab } from "./info-tab";
import { SecurityTab } from "./security-tab";

/** Open to every signed-in user (for "My account"), but each tab is permission-gated. */
export function SettingsPage() {
  const { can } = useAuth();
  const params = useSearchParams();
  const admin = can("settings.manage");
  const tabs: TabItem[] = [
    { id: "info", label: "Madrasa Info", hidden: !admin },
    { id: "academic", label: "Academic", hidden: !admin },
    { id: "fees", label: "Fees", hidden: !admin },
    { id: "communication", label: "Communication", hidden: !admin },
    { id: "security", label: "Security" },
    { id: "data", label: "Backup & Data", hidden: !can("data.manage") },
  ];
  const visible = tabs.filter((x) => !x.hidden);
  const wanted = params.get("tab");
  const [tab, setTab] = useState(visible.find((x) => x.id === wanted)?.id ?? visible[0].id);

  useEffect(() => { const w = visible.find((x) => x.id === wanted)?.id; if (w) setTab(w); }, [wanted]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Settings" description={admin ? "Madrasa information, fees, communication, security and data." : "Your account and security."} crumbs={[{ label: "Settings" }]} />
      <Tabs className="mb-4" tabs={tabs} value={tab} onChange={setTab} />
      {tab === "info" && admin && <InfoTab />}
      {tab === "academic" && admin && <AcademicTab />}
      {tab === "fees" && admin && <FeesTab />}
      {tab === "communication" && admin && <CommunicationTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "data" && can("data.manage") && <DataTab />}
    </>
  );
}
