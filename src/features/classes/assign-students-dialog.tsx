"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input } from "@/components/ui/form";
import { Alert, Avatar, Ltr } from "@/components/ui/misc";
import { useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { assignStudents } from "@/lib/services/classes";
import { classLabel, getClass } from "@/lib/services/students";
import type { ClassRoom } from "@/lib/types";

/** Pick active students from other classes and move them into `cls`. Mount only while open. */
export function AssignStudentsDialog({ cls, onClose }: { cls: ClassRoom; onClose: () => void }) {
  const { t, fmtNum } = useI18n();
  const { scoped } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const n = q.trim().toLowerCase();
    return scoped.students
      .filter((s) => s.status === "Active" && s.classId !== cls.id && (!n || `${s.fullName} ${s.id} ${s.fatherName}`.toLowerCase().includes(n)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [scoped.students, cls.id, q]);
  const mismatch = (g: string) => cls.gender !== "Mixed" && g !== cls.gender;
  const mismatched = scoped.students.filter((s) => picked.has(s.id) && mismatch(s.gender)).length;

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = () => {
    setSaving(true);
    try {
      assignStudents(cls.id, [...picked], actor);
      toast.success(t("{n} student(s) assigned to {class}", { n: picked.size, class: classLabel(cls) }));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open onClose={onClose} size="md" title={t("Assign students to {class}", { class: classLabel(cls) })}
      description={t("Selected students will be moved from their current class.")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={submit} loading={saving} disabled={picked.size === 0}>{t("Assign {n} student(s)", { n: fmtNum(picked.size) })}</Button></>}
    >
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search student by name or ID…")} aria-label={t("Search")} className="mb-3" />
      {mismatched > 0 && <Alert tone="warn" className="mb-3">{t("{n} selected student(s) are not {gender}. This class is for {gender} students.", { n: fmtNum(mismatched), gender: t(cls.gender) })}</Alert>}
      <ul className="scroll-thin max-h-80 divide-y divide-stone-100 overflow-auto rounded-lg border border-stone-200">
        {candidates.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-500">{t("No results found")}</li>}
        {candidates.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2">
            <Checkbox label="" checked={picked.has(s.id)} onChange={() => toggle(s.id)} aria-label={s.fullName} />
            <Avatar name={s.fullName} src={s.photo} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">{s.fullName}</p>
              <p className="truncate text-xs text-stone-500"><Ltr>{s.id}</Ltr> · {classLabel(getClass(scoped, s.classId))}</p>
            </div>
            <Badge tone={mismatch(s.gender) ? "amber" : "gray"}>{t(s.gender)}</Badge>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
