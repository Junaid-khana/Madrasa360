"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import type { ActivityEntry, ActivityKind } from "@/lib/types";

const KINDS: ActivityKind[] = ["auth", "student", "fee", "attendance", "hifz", "donation", "exam", "leave", "communication", "admission", "class", "user", "settings", "data"];
const LABEL: Record<ActivityKind, string> = {
  auth: "Sign-in", student: "Students", fee: "Fees", attendance: "Attendance", hifz: "Hifz", donation: "Donations", exam: "Exams", leave: "Leave",
  communication: "Communication", admission: "Admissions", class: "Classes", user: "Users", settings: "Settings", data: "Data",
};

/** Who did what and when. Read-only, Super Admin only. */
export function AuditLog() {
  const { t, fmtDateTime } = useI18n();
  const { activity } = useDb();
  const [kind, setKind] = useState("");
  const rows = activity.filter((a) => !kind || a.kind === kind);

  const cols: Column<ActivityEntry>[] = [
    { key: "at", header: "When", cell: (a) => fmtDateTime(a.at), sort: (a) => a.at, text: (a) => a.at.replace("T", " ").slice(0, 19), className: "whitespace-nowrap" },
    { key: "user", header: "User", cell: (a) => a.userName, sort: (a) => a.userName, text: (a) => a.userName, hideBelow: "sm" },
    { key: "kind", header: "Area", cell: (a) => <Badge tone="gray">{t(LABEL[a.kind])}</Badge>, text: (a) => LABEL[a.kind], hideBelow: "md" },
    { key: "text", header: "Action", cell: (a) => <span className="text-stone-800">{a.text}</span>, text: (a) => a.text },
  ];
  return (
    <div>
      <div className="mb-2"><h2 className="text-base font-semibold text-stone-900">{t("Audit log")}</h2><p className="text-sm text-stone-500">{t("A record of important actions taken in the system.")}</p></div>
      <DataTable
        columns={cols} rows={rows} rowKey={(a) => a.id} pageSize={10} searchText={(a) => `${a.text} ${a.userName}`} exportName="audit-log" searchPlaceholder="Search activity…"
        toolbar={<Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-auto" aria-label={t("Area")}><option value="">{t("All areas")}</option>{KINDS.map((k) => <option key={k} value={k}>{t(LABEL[k])}</option>)}</Select>}
      />
    </div>
  );
}
