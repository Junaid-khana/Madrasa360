"use client";
import { Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { classStudentCount, deleteClass } from "@/lib/services/classes";
import { classLabel, getTeacher } from "@/lib/services/students";
import type { ClassRoom } from "@/lib/types";
import { ClassFormDialog } from "./class-form-dialog";

export function ClassesTab({ dialog, setDialog }: { dialog: { cls?: ClassRoom } | null; setDialog: (d: { cls?: ClassRoom } | null) => void }) {
  const { t, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const canManage = can("classes.manage");

  const list = scoped.classes.filter((c) => `${classLabel(c)} ${getTeacher(scoped, c.teacherId)?.name ?? ""} ${c.room}`.toLowerCase().includes(q.trim().toLowerCase()));

  const remove = async (c: ClassRoom) => {
    if (!(await confirm({ title: t("Delete {name}?", { name: classLabel(c) }), message: "This removes the class. Classes that still have students cannot be deleted.", confirmLabel: "Delete", tone: "danger" }))) return;
    try { deleteClass(c.id, actor); toast.success(t("Class deleted")); }
    catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };

  return (
    <>
      <div className="mb-4 max-w-sm"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search classes…")} aria-label={t("Search")} /></div>
      {list.length === 0 ? <Card><EmptyState title="No classes found" description="Add a class to get started." /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const teacher = getTeacher(scoped, c.teacherId);
            return (
              <Card key={c.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/classes/${c.id}`} className="min-w-0 text-base font-semibold text-stone-900 hover:text-brand-700">{classLabel(c)}</Link>
                  <Badge tone={c.gender === "Male" ? "blue" : c.gender === "Female" ? "gold" : "gray"}>{t(c.gender)}</Badge>
                </div>
                <p className="mt-1 text-sm text-stone-600">{teacher?.name ?? "—"}</p>
                <p className="text-xs text-stone-500">{c.room || "—"}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-700"><Users className="size-4 text-stone-400" /><span className="font-semibold tabular">{fmtNum(classStudentCount(scoped, c.id))}</span> {t("students")}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.subjects.slice(0, 4).map((s) => <span key={s} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{s}</span>)}
                  {c.subjects.length > 4 && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">+{fmtNum(c.subjects.length - 4)}</span>}
                </div>
                <div className="mt-4 flex flex-1 items-end justify-between gap-2 border-t border-stone-100 pt-3">
                  <Link href={`/classes/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">{t("Open class")}</Link>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ cls: c })} aria-label={t("Edit")}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(c)} aria-label={t("Delete")} className="text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {dialog && <ClassFormDialog cls={dialog.cls} onClose={() => setDialog(null)} />}
    </>
  );
}
