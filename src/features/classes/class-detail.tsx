"use client";
import { ClipboardCheck, Pencil, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { Avatar, EmptyState, Ltr } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/feedback";
import { useActor, useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { attendanceIndex, classRoster, sheetCounts } from "@/lib/services/attendance";
import { saveClass, type ClassData } from "@/lib/services/classes";
import { classLabel, getTeacher } from "@/lib/services/students";
import type { Student } from "@/lib/types";
import { calcAge, todayISO } from "@/lib/utils";
import { AssignStudentsDialog } from "./assign-students-dialog";
import { ClassFormDialog } from "./class-form-dialog";
import { TimetableGrid } from "./timetable-grid";

export function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const router = useRouter();
  const [assign, setAssign] = useState(false);
  const [edit, setEdit] = useState(false);
  const today = todayISO();

  const cls = scoped.classes.find((c) => c.id === id);
  const roster = useMemo(() => classRoster(scoped, id), [scoped, id]);
  const index = useMemo(() => attendanceIndex(scoped), [scoped]);

  if (!cls) {
    return (
      <>
        <PageHeader title="Classes" crumbs={[{ label: "Classes", href: "/classes" }]} />
        <Card><EmptyState title="Class not found" description="This class does not exist or you do not have access to it." action={<LinkButton href="/classes" variant="secondary">{t("Back")}</LinkButton>} /></Card>
      </>
    );
  }

  const teacher = getTeacher(scoped, cls.teacherId);
  const todaySheets = scoped.attendance.filter((a) => a.classId === cls.id && a.date === today);
  const canManage = can("classes.manage");

  const changeTeacher = (teacherId: string) => {
    const { id: _id, ...rest } = cls; void _id;
    try { saveClass(cls.id, { ...rest, teacherId } as ClassData, actor); toast.success(t("Teacher updated")); }
    catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };

  const columns: Column<Student>[] = [
    { key: "id", header: "Student ID", cell: (s) => <Ltr>{s.id}</Ltr>, sort: (s) => s.id, text: (s) => s.id },
    { key: "name", header: "Name", sort: (s) => s.fullName, text: (s) => s.fullName, cell: (s) => (
      <Link href={`/students/${s.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 font-medium text-stone-900 hover:text-brand-700"><Avatar name={s.fullName} src={s.photo} size="sm" />{s.fullName}</Link>
    ) },
    { key: "gender", header: "Gender", cell: (s) => t(s.gender), hideBelow: "sm", text: (s) => s.gender },
    { key: "age", header: "Age", cell: (s) => fmtNum(calcAge(s.dob)), sort: (s) => calcAge(s.dob), text: (s) => calcAge(s.dob), hideBelow: "md" },
    { key: "phone", header: "Phone", cell: (s) => <Ltr>{s.guardian.phone}</Ltr>, hideBelow: "lg", text: (s) => s.guardian.phone },
    { key: "att", header: "Attendance %", sort: (s) => index.get(s.id)?.percent ?? -1, text: (s) => index.get(s.id)?.percent ?? "", cell: (s) => {
      const c = index.get(s.id);
      return c ? <Badge tone={c.percent >= 90 ? "green" : c.percent >= 75 ? "amber" : "red"}>{fmtNum(c.percent)}%</Badge> : "—";
    } },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} />, hideBelow: "sm", text: (s) => s.status },
  ];

  return (
    <>
      <PageHeader
        title={classLabel(cls)} crumbs={[{ label: "Classes", href: "/classes" }, { label: classLabel(cls) }]}
        actions={<>
          {can("attendance.mark") && <LinkButton href={`/attendance?class=${cls.id}`} variant="soft"><ClipboardCheck className="size-4" />{t("Mark attendance")}</LinkButton>}
          {canManage && <Button variant="secondary" onClick={() => setEdit(true)}><Pencil className="size-4" />{t("Edit")}</Button>}
          {canManage && <Button onClick={() => setAssign(true)}><UserPlus className="size-4" />{t("Assign students")}</Button>}
        </>}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Info label="Teacher">
              {canManage ? (
                <Select value={cls.teacherId} onChange={(e) => changeTeacher(e.target.value)} className="h-9 sm:h-9" aria-label={t("Change teacher")}>
                  {scoped.teachers.filter((x) => x.status === "Active" || x.id === cls.teacherId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              ) : teacher?.name ?? "—"}
            </Info>
            <Info label="Room">{cls.room || "—"}</Info>
            <Info label="Gender"><Badge tone={cls.gender === "Male" ? "blue" : cls.gender === "Female" ? "gold" : "gray"}>{t(cls.gender)}</Badge></Info>
            <Info label="Students"><span className="text-lg font-semibold tabular">{fmtNum(roster.length)}</span></Info>
          </CardBody>
          <div className="border-t border-stone-100 px-4 py-3 sm:px-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{t("Subjects")}</p>
            <div className="flex flex-wrap gap-1.5">
              {cls.subjects.length === 0 ? <span className="text-sm text-stone-500">{t("No subjects added yet.")}</span> : cls.subjects.map((s) => <span key={s} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">{s}</span>)}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("Today's Attendance")} />
          <CardBody className="pt-3">
            {todaySheets.length === 0 ? (
              <div><Badge tone="amber">{t("Not marked yet")}</Badge><p className="mt-2 text-sm text-stone-500">{t("Attendance has not been submitted for this class today.")}</p></div>
            ) : todaySheets.map((sh) => {
              const c = sheetCounts(sh);
              return (
                <div key={sh.id} className="text-sm">
                  <Badge tone="green">{t(sh.session)}</Badge>
                  <p className="mt-2 text-stone-700 tabular">{t("Present")} <strong className="text-brand-700">{fmtNum(c.present)}</strong> · {t("Absent")} <strong className="text-red-600">{fmtNum(c.absent)}</strong> · {t("Leave")} <strong className="text-sky-700">{fmtNum(c.leave)}</strong></p>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <h2 className="mb-2 text-base font-semibold text-stone-900">{t("Students")}</h2>
      <DataTable
        columns={columns} rows={roster} rowKey={(s) => s.id} exportName={`class-${classLabel(cls)}`} exportSubtitle={`${classLabel(cls)} — ${teacher?.name ?? ""}`}
        searchText={(s) => `${s.fullName} ${s.id} ${s.guardian.name}`} searchPlaceholder="Search students…" onRowClick={(s) => router.push(`/students/${s.id}`)}
        empty={{ title: "No students in this class", description: "Assign students to this class to see them here.", action: canManage ? <Button onClick={() => setAssign(true)}><UserPlus className="size-4" />{t("Assign students")}</Button> : undefined }}
      />

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={t("Weekly timetable")} className="pb-3" />
        <TimetableGrid slots={cls.timetable} />
      </Card>

      {assign && <AssignStudentsDialog cls={cls} onClose={() => setAssign(false)} />}
      {edit && <ClassFormDialog cls={cls} onClose={() => setEdit(false)} />}
    </>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{t(label)}</p><div className="text-sm text-stone-900">{children}</div></div>;
}
