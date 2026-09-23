"use client";
import { Archive, Eye, Pencil, RotateCcw, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar, Ltr } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { IconButton, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { archiveStudent, classLabel, deleteStudentPermanently, getClass, restoreStudent } from "@/lib/services/students";
import type { Student } from "@/lib/types";
import { STUDENT_STATUSES } from "@/lib/constants";
import { calcAge } from "@/lib/utils";

const AGE_RANGES: Record<string, [number, number]> = { "Under 5": [0, 4], "5–7": [5, 7], "8–10": [8, 10], "11–13": [11, 13], "14 and above": [14, 99] };

export function StudentList() {
  const { t, fmtDate, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [gender, setGender] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("Active");
  const [age, setAge] = useState("");

  const rows = useMemo(() => scoped.students.filter((s) => {
    if (gender && s.gender !== gender) return false;
    if (classId && s.classId !== classId) return false;
    if (status && s.status !== status) return false;
    if (age) { const a = calcAge(s.dob), [lo, hi] = AGE_RANGES[age]; if (a < lo || a > hi) return false; }
    return true;
  }), [scoped.students, gender, classId, status, age]);

  const male = rows.filter((s) => s.gender === "Male").length;
  const cls = (s: Student) => classLabel(getClass(scoped, s.classId));
  const open = (s: Student) => router.push(`/students/${s.id}`);

  const run = async (fn: () => void, ok: string) => {
    try { fn(); toast.success(t(ok)); } catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };
  const onArchive = async (s: Student) => {
    if (await confirm({ title: "Archive this student?", message: "The student will be hidden from classes and attendance. Records are kept and can be restored later.", confirmLabel: "Archive", tone: "danger" }))
      run(() => archiveStudent(s.id, actor), "Student archived");
  };
  const onRestore = (s: Student) => run(() => restoreStudent(s.id, actor), "Student restored");
  const onDelete = async (s: Student) => {
    if (await confirm({ title: "Permanently delete this student?", message: "This removes the student and ALL their attendance, fee, Hifz, result and leave records. This cannot be undone.", confirmLabel: "Delete permanently", tone: "danger" }))
      run(() => deleteStudentPermanently(s.id, actor), "Student deleted");
  };

  const actions = (s: Student) => (
    <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <IconButton label={t("View profile")} className="size-9" onClick={() => open(s)}><Eye className="size-4" /></IconButton>
      {can("students.edit") && <IconButton label={t("Edit")} className="size-9" onClick={() => router.push(`/students/${s.id}/edit`)}><Pencil className="size-4" /></IconButton>}
      {can("students.archive") && s.status !== "Archived" && <IconButton label={t("Archive")} className="size-9" onClick={() => onArchive(s)}><Archive className="size-4" /></IconButton>}
      {can("students.archive") && s.status === "Archived" && <IconButton label={t("Restore")} className="size-9" onClick={() => onRestore(s)}><RotateCcw className="size-4" /></IconButton>}
      {can("students.delete") && s.status === "Archived" && <IconButton label={t("Delete permanently")} className="size-9 text-red-600 hover:bg-red-50" onClick={() => onDelete(s)}><Trash2 className="size-4" /></IconButton>}
    </div>
  );

  const columns: Column<Student>[] = [
    { key: "id", header: "Student ID", cell: (s) => <Ltr className="font-medium text-stone-900">{s.id}</Ltr>, sort: (s) => s.id, text: (s) => s.id },
    {
      key: "name", header: "Student", sort: (s) => s.fullName, text: (s) => s.fullName,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.fullName} src={s.photo} size="sm" />
          <div className="min-w-0">
            <Link href={`/students/${s.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-stone-900 hover:text-brand-700">{s.fullName}</Link>
            <span className="block truncate text-xs text-stone-500">{t("Father's name")}: {s.fatherName}</span>
          </div>
        </div>
      ),
    },
    { key: "gender", header: "Gender", cell: (s) => t(s.gender), sort: (s) => s.gender, text: (s) => s.gender, hideBelow: "sm" },
    { key: "age", header: "Age", cell: (s) => fmtNum(calcAge(s.dob)), sort: (s) => calcAge(s.dob), text: (s) => calcAge(s.dob), hideBelow: "sm" },
    { key: "class", header: "Class", cell: cls, sort: cls, text: cls, className: "whitespace-nowrap" },
    { key: "guardian", header: "Guardian", cell: (s) => s.guardian.name, sort: (s) => s.guardian.name, text: (s) => s.guardian.name, hideBelow: "2xl" },
    { key: "phone", header: "Phone", cell: (s) => <Ltr>{s.guardian.phone}</Ltr>, text: (s) => s.guardian.phone, hideBelow: "md", className: "whitespace-nowrap" },
    { key: "admission", header: "Admission date", cell: (s) => fmtDate(s.admissionDate), sort: (s) => s.admissionDate, text: (s) => s.admissionDate, hideBelow: "2xl" },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} />, sort: (s) => s.status, text: (s) => s.status },
    { key: "actions", header: "Actions", cell: actions, align: "end" },
  ];

  return (
    <>
      <PageHeader
        title="Students" description="All registered students. Search, filter, or open a profile."
        actions={can("students.edit") && <LinkButton href="/students/new"><UserPlus className="size-4" />{t("Add Student")}</LinkButton>}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone="green">{t("Total")}: {fmtNum(rows.length)}</Badge>
        <Badge tone="blue">{t("Boys")}: {fmtNum(male)}</Badge>
        <Badge tone="gold">{t("Girls")}: {fmtNum(rows.length - male)}</Badge>
      </div>
      <DataTable
        columns={columns} rows={rows} rowKey={(s) => s.id} onRowClick={open} exportName="students"
        searchText={(s) => `${s.fullName} ${s.id} ${s.fatherName} ${s.guardian.name} ${s.guardian.phone}`}
        searchPlaceholder="Search by name, ID, guardian or phone"
        defaultSort={{ key: "id", dir: "asc" }}
        empty={{ title: "No students found", description: "Try changing or clearing the filters.", action: can("students.edit") ? <LinkButton href="/students/new">{t("Add Student")}</LinkButton> : undefined }}
        toolbar={
          <>
            <Select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full sm:w-auto" aria-label={t("Gender")}>
              <option value="">{t("Gender")}: {t("All")}</option><option value="Male">{t("Male")}</option><option value="Female">{t("Female")}</option>
            </Select>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full sm:w-auto" aria-label={t("Class")}>
              <option value="">{t("Class")}: {t("All")}</option>
              {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-auto" aria-label={t("Status")}>
              <option value="">{t("Status")}: {t("All")}</option>
              {STUDENT_STATUSES.map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </Select>
            <Select value={age} onChange={(e) => setAge(e.target.value)} className="w-full sm:w-auto" aria-label={t("Age")}>
              <option value="">{t("Age")}: {t("All")}</option>
              {Object.keys(AGE_RANGES).map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </Select>
          </>
        }
        renderCard={(s) => (
          <div className="flex items-center gap-3">
            <Avatar name={s.fullName} src={s.photo} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-stone-900">{s.fullName}</p>
              <p className="truncate text-xs text-stone-500"><Ltr>{s.id}</Ltr> · {cls(s)} · {t(s.gender)}, {fmtNum(calcAge(s.dob))} {t("years")}</p>
              <p className="truncate text-xs text-stone-500">{s.guardian.name} · <Ltr>{s.guardian.phone}</Ltr></p>
            </div>
            <div className="flex flex-col items-end gap-1"><StatusBadge status={s.status} />{actions(s)}</div>
          </div>
        )}
      />
    </>
  );
}
