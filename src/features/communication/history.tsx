"use client";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Ltr } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { MESSAGE_TYPES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { CommunicationMessage } from "@/lib/types";

export function MessageHistory() {
  const { t, fmtDateTime, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const [type, setType] = useState("");
  const [open, setOpen] = useState<CommunicationMessage | null>(null);

  const rows = scoped.messages.filter((m) => !type || m.type === type).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const cols: Column<CommunicationMessage>[] = [
    { key: "date", header: "Date", cell: (m) => fmtDateTime(m.sentAt), sort: (m) => m.sentAt, text: (m) => m.sentAt.slice(0, 16).replace("T", " ") },
    { key: "type", header: "Type", cell: (m) => t(m.type), sort: (m) => m.type, text: (m) => m.type },
    { key: "aud", header: "Audience", cell: (m) => t(m.audience.replace(/^Class: /, "Class: ")), hideBelow: "md", text: (m) => m.audience },
    { key: "n", header: "Recipients", cell: (m) => <Ltr>{fmtNum(m.recipients.length)}</Ltr>, sort: (m) => m.recipients.length, align: "end", text: (m) => m.recipients.length },
    { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} />, text: (m) => m.status },
    { key: "by", header: "Sent by", cell: (m) => m.sentBy, hideBelow: "lg", text: (m) => m.sentBy },
    { key: "act", header: "", cell: (m) => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(m); }} aria-label={t("View")}><Eye className="size-4" /></Button>, align: "end" },
  ];

  return (
    <>
      <DataTable
        columns={cols} rows={rows} rowKey={(m) => m.id} searchText={(m) => `${m.type} ${m.audience} ${m.body} ${m.sentBy}`} exportName="communication-history"
        toolbar={<Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto" aria-label={t("Type")}><option value="">{t("All")}</option>{MESSAGE_TYPES.map((m) => <option key={m} value={m}>{t(m)}</option>)}</Select>}
        onRowClick={setOpen} empty={{ title: "No messages yet", description: "Messages you send will be listed here." }}
      />
      <Modal open={!!open} onClose={() => setOpen(null)} size="lg" title={open ? t(open.type) : ""} description={open ? `${fmtDateTime(open.sentAt)} · ${t(open.audience)} · ${open.sentBy}` : undefined}
        footer={<Button variant="secondary" onClick={() => setOpen(null)}>{t("Close")}</Button>}>
        {open && (
          <div className="space-y-4">
            <div className="flex items-center gap-2"><StatusBadge status={open.status} /><span className="text-sm text-stone-500">{t("{n} recipient(s)", { n: open.recipients.length })}</span></div>
            <div dir="auto" className="whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm">{open.body}</div>
            <ul className="max-h-72 divide-y divide-stone-100 overflow-auto rounded-lg border border-stone-200">
              {open.recipients.map((r, i) => (
                <li key={`${r.studentId}-${i}`} className="px-3 py-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{r.name}</span><Ltr className="text-stone-500">{r.phone}</Ltr></div>
                  <p dir="auto" className="mt-0.5 text-xs text-stone-500">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}
