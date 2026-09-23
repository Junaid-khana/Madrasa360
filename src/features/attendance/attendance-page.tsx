"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth/auth";
import { SESSIONS } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import { HistoryTab } from "./history-tab";
import { MarkTab } from "./mark-tab";
import { ReportTab } from "./report-tab";
import type { Selection } from "./shared";

const TABS = [{ id: "mark", label: "Mark" }, { id: "history", label: "History" }, { id: "report", label: "Monthly Report" }];

export function AttendancePage() {
  const params = useSearchParams();
  const { scoped } = useAuth();
  const confirm = useConfirm();
  const today = todayISO();

  const [tab, setTab] = useState("mark");
  const [sel, setSel] = useState<Selection>(() => {
    const c = params.get("class");
    const d = params.get("date");
    const s = params.get("session");
    return {
      classId: scoped.classes.some((x) => x.id === c) ? c! : scoped.classes[0]?.id ?? "",
      date: d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today,
      session: SESSIONS.find((x) => x === s) ?? "Morning",
    };
  });
  const dirty = useRef(false);
  const onDirty = useCallback((d: boolean) => { dirty.current = d; }, []);

  const goTab = async (id: string) => {
    if (tab === "mark" && dirty.current && !(await confirm({
      title: "Discard unsaved changes?", message: "You have attendance changes that are not saved. Switching will discard them.",
      confirmLabel: "Discard", tone: "danger",
    }))) return;
    setTab(id);
  };

  return (
    <>
      <PageHeader title="Attendance" description="Mark daily attendance, review history and print monthly reports." crumbs={[{ label: "Attendance" }]} />
      <Tabs tabs={TABS} value={tab} onChange={goTab} className="mb-4" />
      {tab === "mark" && <MarkTab sel={sel} onSel={setSel} onDirty={onDirty} />}
      {tab === "history" && <HistoryTab onEdit={(s) => { setSel(s); setTab("mark"); }} />}
      {tab === "report" && <ReportTab />}
    </>
  );
}
