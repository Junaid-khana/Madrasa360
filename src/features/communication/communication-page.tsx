"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Composer, initialFromParams } from "./composer";
import { MessageHistory } from "./history";

export function CommunicationPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const initial = initialFromParams(params.get("audience"));
  return (
    <>
      <PageHeader title="Communication" description="Send SMS, announcements, fee reminders and attendance alerts to guardians." crumbs={[{ label: "Communication" }]} />
      <Tabs className="mb-4" value={tab} onChange={(v) => setTab(v as "compose" | "history")} tabs={[{ id: "compose", label: "New message" }, { id: "history", label: "History" }]} />
      {tab === "compose" ? <Composer initial={initial} /> : <MessageHistory />}
    </>
  );
}
