"use client";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classLabel } from "@/lib/services/students";
import type { LeaveRecord } from "@/lib/types";
import { DecideDialog } from "./decide-dialog";
import { LeaveDialog } from "./leave-dialog";
import { LeaveTable } from "./leave-table";

export function LeavePage() {
  const { t, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const canManage = can("leave.manage");
  const [adding, setAdding] = useState(canManage && params.get("add") === "1");
  const [deciding, setDeciding] = useState<{ leave: LeaveRecord; decision: "Approved" | "Rejected" } | null>(null);
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const classOf = new Map(scoped.students.map((s) => [s.id, s.classId]));
    return scoped.leaves
      .filter((l) => (!status || l.status === status) && (!classId || classOf.get(l.studentId) === classId)
        && (!from || l.endDate >= from) && (!to || l.startDate <= to))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [scoped, status, classId, from, to]);
  const count = (s: string) => scoped.leaves.filter((l) => l.status === s).length;

  const closeAdd = () => { setAdding(false); if (params.get("add")) router.replace("/leave"); };

  return (
    <>
      <PageHeader
        title="Leave" description="Leave applications for students, with approval." crumbs={[{ label: "Leave" }]}
        actions={canManage && <Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("New leave")}</Button>}
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {(["Pending", "Approved", "Rejected"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? "" : s)} className={`text-start ${status === s ? "rounded-[var(--radius-card)] ring-2 ring-brand-500" : ""}`}>
            <Stat label={s} value={fmtNum(count(s))} tone={s === "Pending" ? "gold" : s === "Approved" ? "green" : "red"} />
          </button>
        ))}
      </div>
      <LeaveTable
        rows={rows} exportName="leave-report" onDecide={canManage ? (leave, decision) => setDeciding({ leave, decision }) : undefined}
        empty={{ title: "No leave records", description: "Leave applications will appear here.", action: canManage ? <Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("New leave")}</Button> : undefined }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label={t("Status")}>
              <option value="">{t("All statuses")}</option>
              {["Pending", "Approved", "Rejected"].map((s) => <option key={s} value={s}>{t(s)}</option>)}
            </Select>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto" aria-label={t("Class")}>
              <option value="">{t("All classes")}</option>
              {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </Select>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label={t("From")} className="w-auto" />
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label={t("To")} className="w-auto" />
          </div>
        }
      />
      <LeaveDialog open={adding} onClose={closeAdd} studentId={params.get("student") ?? undefined} />
      {deciding && <DecideDialog leave={deciding.leave} decision={deciding.decision} onClose={() => setDeciding(null)} />}
    </>
  );
}
