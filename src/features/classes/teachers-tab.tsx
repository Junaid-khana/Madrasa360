"use client";
import { Pencil, Power } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar, Ltr } from "@/components/ui/misc";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { saveTeacher, teacherClasses } from "@/lib/services/classes";
import { classLabel } from "@/lib/services/students";
import type { Teacher } from "@/lib/types";
import { TeacherDialog } from "./teacher-dialog";

export function TeachersTab({ dialog, setDialog }: { dialog: { teacher?: Teacher } | null; setDialog: (d: { teacher?: Teacher } | null) => void }) {
  const { t } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = can("teachers.manage");
  const [busy, setBusy] = useState("");

  const toggle = async (x: Teacher) => {
    const next = x.status === "Active" ? "Inactive" : "Active";
    if (next === "Inactive" && !(await confirm({ title: t("Deactivate {name}?", { name: x.name }), message: "The teacher keeps their classes and history, but will be marked inactive.", confirmLabel: "Deactivate", tone: "danger" }))) return;
    setBusy(x.id);
    try {
      const { id: _id, ...rest } = x; void _id;
      saveTeacher(x.id, { ...rest, status: next }, actor);
      toast.success(t("Saved successfully"));
    } catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
    finally { setBusy(""); }
  };

  const classesOf = (x: Teacher) => teacherClasses(scoped, x.id).map(classLabel).join(", ");
  const columns: Column<Teacher>[] = [
    { key: "name", header: "Name", sort: (x) => x.name, text: (x) => x.name, cell: (x) => (
      <div className="flex items-center gap-3"><Avatar name={x.name} size="sm" /><div className="min-w-0"><p className="font-medium text-stone-900">{x.name}</p><p className="text-xs text-stone-500">{t(x.gender)}</p></div></div>
    ) },
    { key: "phone", header: "Phone", cell: (x) => <Ltr>{x.phone}</Ltr>, text: (x) => x.phone, hideBelow: "sm" },
    { key: "qual", header: "Qualification", cell: (x) => x.qualification || "—", text: (x) => x.qualification, hideBelow: "lg" },
    { key: "spec", header: "Specialization", cell: (x) => x.specialization || "—", text: (x) => x.specialization, hideBelow: "md" },
    { key: "classes", header: "Assigned classes", cell: (x) => classesOf(x) || "—", text: classesOf, hideBelow: "md", className: "max-w-56" },
    { key: "status", header: "Status", cell: (x) => <StatusBadge status={x.status} />, sort: (x) => x.status, text: (x) => x.status },
    ...(canEdit ? [{
      key: "act", header: "Actions", align: "end" as const, cell: (x: Teacher) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setDialog({ teacher: x })}><Pencil className="size-3.5" />{t("Edit")}</Button>
          <Button size="sm" variant="ghost" loading={busy === x.id} onClick={() => toggle(x)}><Power className="size-3.5" />{t(x.status === "Active" ? "Deactivate" : "Activate")}</Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      <DataTable
        columns={columns} rows={scoped.teachers} rowKey={(x) => x.id} exportName="teachers" searchPlaceholder="Search teachers…"
        searchText={(x) => `${x.name} ${x.phone} ${x.specialization} ${classesOf(x)}`} defaultSort={{ key: "name", dir: "asc" }}
        empty={{ title: "No teachers yet", description: "Add your first teacher to get started." }}
      />
      {dialog && <TeacherDialog teacher={dialog.teacher} onClose={() => setDialog(null)} />}
    </>
  );
}
