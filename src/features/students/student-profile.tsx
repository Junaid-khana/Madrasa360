"use client";
import { Archive, BookOpen, CalendarPlus, FileUp, Pencil, Printer, RotateCcw, Trash2, Wallet } from "lucide-react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { AccessDenied } from "@/components/layout/app-shell";
import { usePrint } from "@/components/print/print";
import { StatusBadge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { Avatar, EmptyState, Ltr, ProgressBar, Stat } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { StudentAttendancePanel } from "@/features/attendance/student-attendance-panel";
import { StudentResultsPanel } from "@/features/exams/student-results-panel";
import { CollectFeeDialog } from "@/features/fees/collect-fee-dialog";
import { StudentFeesPanel } from "@/features/fees/student-fees-panel";
import { HifzEntryDialog } from "@/features/hifz/hifz-entry-dialog";
import { HifzProgressPanel } from "@/features/hifz/hifz-progress-panel";
import { LeaveDialog } from "@/features/leave/leave-dialog";
import { StudentLeavePanel } from "@/features/leave/student-leave-panel";
import { useActor, useAuth } from "@/lib/auth/auth";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { studentAttendance } from "@/lib/services/attendance";
import { resultCard } from "@/lib/services/exams";
import { buildLedger, outstandingByStudent } from "@/lib/services/fees";
import {
  addDocument, archiveStudent, classLabel, getClass, getTeacher, hifzProgressPercent, removeDocument, restoreStudent,
} from "@/lib/services/students";
import type { CommunicationMessage, MessageRecipient, Student, StudentDocument } from "@/lib/types";
import { calcAge } from "@/lib/utils";
import { StudentProfileSheet } from "./profile-sheet";

function DetailList({ items }: { items: [string, ReactNode][] }) {
  const { t } = useI18n();
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{t(k)}</dt>
          <dd className="mt-0.5 break-words text-sm text-stone-900">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const { t, fmtDate, fmtMoney, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const db = useDb();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const print = usePrint();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dialog, setDialog] = useState<"fee" | "hifz" | "leave" | null>(null);

  const student = scoped.students.find((s) => s.id === id);
  if (!student) {
    if (db.students.some((s) => s.id === id)) return <AccessDenied />; // exists, but outside this teacher's classes
    return <EmptyState title="Student not found" description="This student does not exist or has been removed." action={<LinkButton href="/students">{t("Students")}</LinkButton>} />;
  }

  const cls = getClass(scoped, student.classId);
  const teacher = cls ? getTeacher(scoped, cls.teacherId) : undefined;
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal Information" },
    { id: "guardian", label: "Guardian" },
    { id: "attendance", label: "Attendance", hidden: !can("attendance.view") },
    { id: "fees", label: "Fees", hidden: !can("fees.view") },
    { id: "hifz", label: "Hifz Progress", hidden: !can("hifz.view") },
    { id: "results", label: "Academic Results", hidden: !can("academics.view") },
    { id: "leave", label: "Leave", hidden: !can("leave.view") },
    { id: "communication", label: "Communication", hidden: !can("communication.send") },
    { id: "documents", label: "Documents" },
  ];
  const requested = params.get("tab") ?? "overview";
  const tab = tabs.find((x) => x.id === requested && !x.hidden) ? requested : "overview";
  const setTab = (next: string) => router.replace(`${pathname}?tab=${next}`, { scroll: false });

  const onArchive = async () => {
    if (!(await confirm({ title: "Archive this student?", message: "The student will be hidden from classes and attendance. Records are kept and can be restored later.", confirmLabel: "Archive", tone: "danger" }))) return;
    archiveStudent(student.id, actor);
    toast.success(t("Student archived"));
  };
  const onRestore = () => { restoreStudent(student.id, actor); toast.success(t("Student restored")); };

  return (
    <>
      <PageHeader title="Student Profile" crumbs={[{ label: "Students", href: "/students" }, { label: student.fullName }]} />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={student.fullName} src={student.photo} size="xl" />
          <div className="min-w-0 flex-1 basis-60">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-stone-900">{student.fullName}</h2>
              <StatusBadge status={student.status} />
            </div>
            <p className="mt-1 text-sm text-stone-600">
              <Ltr>{student.id}</Ltr> · {classLabel(cls)} · {t(student.gender)} · {fmtNum(calcAge(student.dob))} {t("years")}
            </p>
            <p className="text-sm text-stone-500">{t("Father's name")}: {student.fatherName}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {can("fees.manage") && student.status === "Active" && <Button variant="soft" onClick={() => setDialog("fee")}><Wallet className="size-4" />{t("Collect Fee")}</Button>}
            {can("hifz.record") && student.status === "Active" && <Button variant="soft" onClick={() => setDialog("hifz")}><BookOpen className="size-4" />{t("Add Hifz progress")}</Button>}
            {can("leave.manage") && <Button variant="soft" onClick={() => setDialog("leave")}><CalendarPlus className="size-4" />{t("New leave")}</Button>}
            <Button variant="secondary" onClick={() => print(<StudentProfileSheet studentId={student.id} />)}><Printer className="size-4" />{t("Print")}</Button>
            {can("students.edit") && <LinkButton variant="secondary" href={`/students/${student.id}/edit`}><Pencil className="size-4" />{t("Edit")}</LinkButton>}
            {can("students.archive") && (student.status === "Archived"
              ? <Button variant="secondary" onClick={onRestore}><RotateCcw className="size-4" />{t("Restore")}</Button>
              : <Button variant="secondary" onClick={onArchive}><Archive className="size-4" />{t("Archive")}</Button>)}
          </div>
        </CardBody>
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === "overview" && <Overview student={student} teacherName={teacher?.name} classText={classLabel(cls)} />}
      {tab === "personal" && (
        <Card><CardHeader title={t("Personal Information")} /><CardBody>
          <DetailList items={[
            ["Full name", student.fullName], ["Father's name", student.fatherName], ["Gender", t(student.gender)],
            ["Date of birth", `${fmtDate(student.dob)} (${fmtNum(calcAge(student.dob))} ${t("years")})`],
            ["B-Form / CNIC reference", student.bForm && <Ltr>{student.bForm}</Ltr>], ["Student ID", <Ltr key="i">{student.id}</Ltr>],
            ["Address", student.address], ["City", student.city], ["Province", t(student.province)],
            ["Previous school / madrasa", student.previousSchool], ["Hostel / Day scholar", t(student.residence)],
          ]} />
        </CardBody></Card>
      )}
      {tab === "guardian" && (
        <Card><CardHeader title={t("Guardian Information")} /><CardBody>
          <DetailList items={[
            ["Guardian name", student.guardian.name], ["Relationship", t(student.guardian.relationship)],
            ["Phone", <a key="p" href={`tel:${student.guardian.phone}`} className="text-brand-700 hover:underline"><Ltr>{student.guardian.phone}</Ltr></a>],
            ["Alternate phone", student.guardian.altPhone && <a key="a" href={`tel:${student.guardian.altPhone}`} className="text-brand-700 hover:underline"><Ltr>{student.guardian.altPhone}</Ltr></a>],
            ["Email", student.guardian.email && <Ltr key="e">{student.guardian.email}</Ltr>], ["Address", student.guardian.address || student.address],
          ]} />
        </CardBody></Card>
      )}
      {tab === "attendance" && <StudentAttendancePanel studentId={student.id} />}
      {tab === "fees" && <StudentFeesPanel studentId={student.id} />}
      {tab === "hifz" && <HifzProgressPanel studentId={student.id} />}
      {tab === "results" && <StudentResultsPanel studentId={student.id} />}
      {tab === "leave" && <StudentLeavePanel studentId={student.id} />}
      {tab === "communication" && <CommunicationTab studentId={student.id} />}
      {tab === "documents" && <DocumentsTab studentId={student.id} />}

      <CollectFeeDialog open={dialog === "fee"} onClose={() => setDialog(null)} studentId={student.id} />
      <HifzEntryDialog open={dialog === "hifz"} onClose={() => setDialog(null)} studentId={student.id} />
      <LeaveDialog open={dialog === "leave"} onClose={() => setDialog(null)} studentId={student.id} />
    </>
  );
}

function Overview({ student, teacherName, classText }: { student: Student; teacherName?: string; classText: string }) {
  const { t, fmtDate, fmtMoney, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const att = studentAttendance(scoped, student.id);
  const owed = outstandingByStudent(buildLedger(scoped)).get(student.id) ?? 0;
  const hasHifz = student.hifz.status !== "Not Started";
  const latest = scoped.results.filter((r) => r.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const last = latest ? resultCard(scoped, student.id, latest.exam) : null;
  const progress = hifzProgressPercent(student);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("attendance.view") && <Stat label="Attendance" tone={att.percent >= 85 || !att.total ? "green" : "red"} value={att.total ? `${fmtNum(att.percent)}%` : "—"}
          sub={`${t("Present")} ${fmtNum(att.present)} · ${t("Absent")} ${fmtNum(att.absent)} · ${t("Leave")} ${fmtNum(att.leave)}`} />}
        {can("fees.view") && <Stat label="Outstanding Fees" tone={owed > 0 ? "red" : "green"} value={fmtMoney(owed)} sub={owed > 0 ? t("Fees are due") : t("All fees are clear")} />}
        {can("hifz.view") && <Stat label="Hifz Progress" tone="gold" value={hasHifz ? `${fmtNum(progress)}%` : "—"} sub={hasHifz ? `${fmtNum(student.hifz.parasCompleted)} / 30 ${t("Paras")}` : t("Hifz not started")} />}
        {can("academics.view") && <Stat label="Last result" tone="blue" value={last ? `${fmtNum(last.percentage)}%` : "—"} sub={last ? `${last.exam} · ${t("Grade")} ${last.grade}` : t("No results yet")} />}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader title={t("Madrasa Information")} /><CardBody>
          <DetailList items={[
            ["Class", classText], ["Teacher", teacherName], ["Admission date", fmtDate(student.admissionDate)], ["Hostel / Day scholar", t(student.residence)],
            ["Nazra status", t(student.nazraStatus)], ["Hifz status", t(student.hifz.status)],
            ...(can("fees.view") ? [["Monthly fee", fmtMoney(student.monthlyFee)], ["Discount", fmtMoney(student.discount)]] as [string, ReactNode][] : []),
          ]} />
        </CardBody></Card>

        <Card><CardHeader title={t("Guardian Information")} /><CardBody>
          <DetailList items={[
            ["Guardian name", student.guardian.name], ["Relationship", t(student.guardian.relationship)],
            ["Phone", <a key="p" href={`tel:${student.guardian.phone}`} className="text-brand-700 hover:underline"><Ltr>{student.guardian.phone}</Ltr></a>],
            ["City", student.city],
          ]} />
        </CardBody></Card>

        {can("hifz.view") && hasHifz && (
          <Card className="lg:col-span-2"><CardHeader title={t("Current Hifz lesson")} /><CardBody className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>{t("Current Para")} {fmtNum(student.hifz.currentPara)} · {student.hifz.currentSurah}</span><span className="tabular text-stone-500">{fmtNum(progress)}%</span></div>
              <ProgressBar value={progress} tone="gold" />
            </div>
            <DetailList items={[
              ["Daily lesson (Sabaq)", student.hifz.dailyLesson], ["Previous lesson (Sabqi)", student.hifz.previousLesson],
              ["Revision (Manzil)", student.hifz.revision], ["Teacher remarks", student.hifz.remarks],
            ]} />
          </CardBody></Card>
        )}
      </div>
    </div>
  );
}

type Sent = { msg: CommunicationMessage; rec: MessageRecipient };

function CommunicationTab({ studentId }: { studentId: string }) {
  const { fmtDateTime } = useI18n();
  const { scoped } = useAuth();
  const rows: Sent[] = scoped.messages.flatMap((msg) => {
    const rec = msg.recipients.find((r) => r.studentId === studentId);
    return rec ? [{ msg, rec }] : [];
  });
  const columns: Column<Sent>[] = [
    { key: "date", header: "Date", cell: (r) => fmtDateTime(r.msg.sentAt), sort: (r) => r.msg.sentAt, text: (r) => r.msg.sentAt },
    { key: "type", header: "Type", cell: (r) => <span className="whitespace-nowrap">{r.msg.type}</span>, text: (r) => r.msg.type, sort: (r) => r.msg.type },
    { key: "body", header: "Message", cell: (r) => <span className="line-clamp-2 min-w-48 text-stone-600">{r.rec.body}</span>, text: (r) => r.rec.body },
    { key: "to", header: "Sent to", cell: (r) => <Ltr>{r.rec.phone}</Ltr>, text: (r) => r.rec.phone, hideBelow: "md" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.msg.status} />, text: (r) => r.msg.status },
  ];
  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.msg.id} defaultSort={{ key: "date", dir: "desc" }}
      empty={{ title: "No messages sent", description: "Messages sent to this student's guardian will appear here." }} />
  );
}

function DocumentsTab({ studentId }: { studentId: string }) {
  const { t, fmtDate, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(DOCUMENT_TYPES[0]);
  const rows = scoped.documents.filter((d) => d.studentId === studentId);
  const edit = can("students.edit");

  const onFile = (file?: File) => {
    if (!file) return;
    addDocument(studentId, file.name, type, Math.max(1, Math.ceil(file.size / 1024)), actor);
    toast.success(t("Document added"));
  };
  const onRemove = async (d: StudentDocument) => {
    if (await confirm({ title: "Remove this document?", message: "The document record will be deleted.", confirmLabel: "Delete", tone: "danger" })) {
      removeDocument(d.id, actor);
      toast.success(t("Document removed"));
    }
  };

  const columns: Column<StudentDocument>[] = [
    { key: "name", header: "Document", cell: (d) => <span className="font-medium text-stone-900">{d.name}</span>, sort: (d) => d.name },
    { key: "type", header: "Type", cell: (d) => t(d.type), sort: (d) => d.type },
    { key: "size", header: "Size", cell: (d) => <Ltr>{fmtNum(d.sizeKb)} KB</Ltr>, hideBelow: "sm" },
    { key: "date", header: "Uploaded", cell: (d) => fmtDate(d.uploadedAt), sort: (d) => d.uploadedAt, hideBelow: "sm" },
    ...(edit ? [{ key: "x", header: "Actions", align: "end" as const, cell: (d: StudentDocument) => (
      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onRemove(d)}><Trash2 className="size-4" />{t("Delete")}</Button>
    ) }] : []),
  ];

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(d) => d.id} defaultSort={{ key: "date", dir: "desc" }}
      empty={{ title: "No documents", description: "B-Form, birth certificate and other papers can be recorded here." }}
      toolbar={edit && (
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto" aria-label={t("Type")}>
            {DOCUMENT_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}
          </Select>
          <input ref={fileRef} type="file" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <Button size="sm" onClick={() => fileRef.current?.click()}><FileUp className="size-4" />{t("Add document")}</Button>
        </div>
      )}
    />
  );
}
