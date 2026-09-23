"use client";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import type { LeaveRecord } from "@/lib/types";
import { DecideDialog } from "./decide-dialog";
import { LeaveDialog } from "./leave-dialog";
import { LeaveTable } from "./leave-table";

/** Leave tab of the student profile: this student's applications plus a "New leave" button. */
export function StudentLeavePanel({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const { scoped, can } = useAuth();
  const canManage = can("leave.manage");
  const [adding, setAdding] = useState(false);
  const [deciding, setDeciding] = useState<{ leave: LeaveRecord; decision: "Approved" | "Rejected" } | null>(null);
  const rows = useMemo(() => scoped.leaves.filter((l) => l.studentId === studentId).sort((a, b) => b.startDate.localeCompare(a.startDate)), [scoped.leaves, studentId]);
  const add = <Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("New leave")}</Button>;

  return (
    <div className="space-y-3">
      {canManage && <div className="flex justify-end">{add}</div>}
      <LeaveTable
        compact rows={rows} onDecide={canManage ? (leave, decision) => setDeciding({ leave, decision }) : undefined}
        empty={{ title: "No leave records", description: "This student has no leave applications.", action: canManage ? add : undefined }}
      />
      <LeaveDialog open={adding} onClose={() => setAdding(false)} studentId={studentId} />
      {deciding && <DecideDialog leave={deciding.leave} decision={deciding.decision} onClose={() => setDeciding(null)} />}
    </div>
  );
}
