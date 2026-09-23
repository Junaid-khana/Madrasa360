"use client";
import { Check, Eye, Plus, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Ltr } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { useActor, useAuth } from "@/lib/auth/auth";
import { ADMISSION_STATUSES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { applicationSchema, createApplication, setApplicationStatus } from "@/lib/services/admissions";
import { classLabel, getClass } from "@/lib/services/students";
import type { AdmissionApplication, AdmissionStatus } from "@/lib/types";
import { addMonths, calcAge, monthOf, todayISO } from "@/lib/utils";
import { useForm } from "@/lib/use-form";

const STATUS_TONE: Record<AdmissionStatus, "blue" | "amber" | "green" | "red" | "gold"> = {
  New: "blue", "Under Review": "amber", Accepted: "green", Rejected: "red", Admitted: "gold",
};

export function AdmissionsPage() {
  const { t, fmtDate, fmtNum, fmtMonth } = useI18n();
  const { scoped } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const apps = scoped.applications;
  const rows = useMemo(() => apps.filter((a) => !status || a.status === status), [apps, status]);
  const count = (s: AdmissionStatus) => apps.filter((a) => a.status === s).length;

  const move = async (a: AdmissionApplication, next: AdmissionStatus) => {
    if (next === "Rejected" && !(await confirm({ title: "Reject this application?", message: "You can reopen it later by marking it Under Review.", confirmLabel: "Reject", tone: "danger" }))) return;
    setApplicationStatus(a.id, next, actor);
    toast.success(t("Application marked {status}", { status: t(next) }));
  };

  const actions = (a: AdmissionApplication) => (
    <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {(a.status === "New" || a.status === "Rejected") && <Button size="sm" variant="secondary" onClick={() => move(a, "Under Review")}><Eye className="size-4" />{t("Under review")}</Button>}
      {(a.status === "New" || a.status === "Under Review") && <Button size="sm" variant="soft" onClick={() => move(a, "Accepted")}><Check className="size-4" />{t("Accept")}</Button>}
      {(a.status === "New" || a.status === "Under Review") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => move(a, "Rejected")}><X className="size-4" />{t("Reject")}</Button>}
      {a.status === "Accepted" && <Button size="sm" onClick={() => router.push(`/students/new?application=${a.id}`)}><UserCheck className="size-4" />{t("Admit")}</Button>}
      {a.status === "Admitted" && a.studentId && <Link href={`/students/${a.studentId}`} className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50">{t("View profile")}</Link>}
    </div>
  );

  const cls = (a: AdmissionApplication) => classLabel(getClass(scoped, a.appliedClassId));
  const columns: Column<AdmissionApplication>[] = [
    { key: "id", header: "Application", cell: (a) => <Ltr className="font-medium text-stone-900">{a.id}</Ltr>, sort: (a) => a.id, text: (a) => a.id },
    {
      key: "name", header: "Applicant", sort: (a) => a.applicantName, text: (a) => a.applicantName,
      cell: (a) => <div className="min-w-0"><span className="block truncate font-medium text-stone-900">{a.applicantName}</span><span className="block truncate text-xs text-stone-500">{t("Father's name")}: {a.fatherName}</span></div>,
    },
    { key: "gender", header: "Gender", cell: (a) => t(a.gender), text: (a) => a.gender, hideBelow: "md" },
    { key: "age", header: "Age", cell: (a) => fmtNum(calcAge(a.dob)), text: (a) => calcAge(a.dob), sort: (a) => calcAge(a.dob), hideBelow: "md" },
    { key: "class", header: "Applied for class", cell: cls, text: cls, sort: cls },
    { key: "phone", header: "Phone", cell: (a) => <Ltr>{a.guardianPhone}</Ltr>, text: (a) => a.guardianPhone, hideBelow: "lg" },
    { key: "date", header: "Applied on", cell: (a) => fmtDate(a.appliedDate), text: (a) => a.appliedDate, sort: (a) => a.appliedDate, hideBelow: "lg" },
    { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} />, text: (a) => a.status, sort: (a) => a.status },
    { key: "actions", header: "Actions", cell: actions, align: "end" },
  ];

  // Admissions report: students admitted per month over the last 12 months.
  const report = useMemo(() => {
    const thisMonth = monthOf(todayISO());
    return Array.from({ length: 12 }, (_, i) => addMonths(thisMonth, i - 11)).reverse().map((m) => {
      const list = scoped.students.filter((s) => monthOf(s.admissionDate) === m);
      return { month: m, boys: list.filter((s) => s.gender === "Male").length, girls: list.filter((s) => s.gender === "Female").length, total: list.length };
    });
  }, [scoped.students]);
  type Row = (typeof report)[number];
  const reportCols: Column<Row>[] = [
    { key: "m", header: "Month", cell: (r) => fmtMonth(r.month), text: (r) => r.month },
    { key: "b", header: "Boys", cell: (r) => fmtNum(r.boys), text: (r) => r.boys, align: "end" },
    { key: "g", header: "Girls", cell: (r) => fmtNum(r.girls), text: (r) => r.girls, align: "end" },
    { key: "t", header: "Total", cell: (r) => <b>{fmtNum(r.total)}</b>, text: (r) => r.total, align: "end" },
  ];

  return (
    <>
      <PageHeader title="Admissions" description="Track applications from first enquiry to admission."
        actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("New application")}</Button>} />

      <div className="mb-3 flex flex-wrap gap-2">
        {ADMISSION_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(status === s ? "" : s)} aria-pressed={status === s} className="rounded-full focus-visible:outline-2">
            <Badge tone={STATUS_TONE[s]} className={status === s ? "ring-2" : "opacity-90 hover:opacity-100"}>{t(s)}: {fmtNum(count(s))}</Badge>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns} rows={rows} rowKey={(a) => a.id} exportName="admission-applications"
        searchText={(a) => `${a.applicantName} ${a.fatherName} ${a.id} ${a.guardianPhone}`} searchPlaceholder="Search applications"
        defaultSort={{ key: "date", dir: "desc" }}
        empty={{ title: "No applications", description: "New admission enquiries will appear here.", action: <Button onClick={() => setAdding(true)}>{t("New application")}</Button> }}
        toolbar={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-auto" aria-label={t("Status")}>
            <option value="">{t("Status")}: {t("All")}</option>
            {ADMISSION_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </Select>
        }
        renderCard={(a) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-medium text-stone-900">{a.applicantName}</p><p className="truncate text-xs text-stone-500"><Ltr>{a.id}</Ltr> · {cls(a)} · {t(a.gender)}, {fmtNum(calcAge(a.dob))} {t("years")}</p></div>
              <StatusBadge status={a.status} />
            </div>
            {actions(a)}
          </div>
        )}
      />

      <Card className="mt-6">
        <CardHeader title={t("Admissions report")} description={t("Students admitted per month (last 12 months)")} />
        <div className="p-3 sm:p-4">
          <DataTable columns={reportCols} rows={report} rowKey={(r) => r.month} pageSize={12} exportName="admissions-report" exportSubtitle={t("Students admitted per month (last 12 months)")} className="border-0 shadow-none" />
        </div>
      </Card>

      <ApplicationDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function ApplicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { scoped } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const f = useForm(applicationSchema, {
    applicantName: "", fatherName: "", dob: "", gender: "Male", guardianPhone: "", address: "", appliedClassId: "", previousSchool: "", notes: "",
  });

  const save = () => {
    const data = f.validate();
    if (!data) return;
    try {
      createApplication(data, actor);
      toast.success(t("Application saved"));
      f.setValues({ applicantName: "", fatherName: "", dob: "", gender: "Male", guardianPhone: "", address: "", appliedClassId: "", previousSchool: "", notes: "" });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("New application")} description={t("Record an admission enquiry. Fields marked * are required.")} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={save}>{t("Save")}</Button></>}>
      <FormGrid>
        <Field label={t("Applicant name")} required error={f.error("applicantName")}><Input {...f.field("applicantName")} /></Field>
        <Field label={t("Father's name")} required error={f.error("fatherName")}><Input {...f.field("fatherName")} /></Field>
        <Field label={t("Date of birth")} required error={f.error("dob")}><Input type="date" {...f.field("dob")} /></Field>
        <Field label={t("Gender")} required><Select {...f.field("gender")}><option value="Male">{t("Male")}</option><option value="Female">{t("Female")}</option></Select></Field>
        <Field label={t("Guardian phone")} required error={f.error("guardianPhone")}><Input type="tel" dir="ltr" placeholder="0300-1234567" {...f.field("guardianPhone")} /></Field>
        <Field label={t("Applying for class")} required error={f.error("appliedClassId")}>
          <Select {...f.field("appliedClassId")} error={!!f.error("appliedClassId")}>
            <option value="">{t("Select…")}</option>
            {scoped.classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)} ({t(c.gender)})</option>)}
          </Select>
        </Field>
        <Field label={t("Address")}><Input {...f.field("address")} /></Field>
        <Field label={t("Previous school / madrasa")}><Input {...f.field("previousSchool")} /></Field>
        <div className="sm:col-span-2"><Field label={t("Notes")}><Textarea value={String(f.get("notes"))} onChange={(e) => f.set("notes", e.target.value)} /></Field></div>
      </FormGrid>
    </Modal>
  );
}
