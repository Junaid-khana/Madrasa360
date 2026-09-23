"use client";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Guard } from "@/components/layout/app-shell";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth/auth";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { applicationToStudent } from "@/lib/services/admissions";
import { blankStudent } from "@/lib/services/students";
import { StudentForm } from "./student-form";

export function NewStudentPage() {
  const { t } = useI18n();
  const db = useDb();
  const params = useSearchParams();
  const applicationId = params.get("application") ?? undefined;
  const classId = params.get("class") ?? "";
  // Compute the starting values once so later store updates never reset what the user has typed.
  const initial = useMemo(() => {
    const app = applicationId ? db.applications.find((a) => a.id === applicationId) : undefined;
    return app ? applicationToStudent(db, app) : blankStudent(db, classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, classId]);
  return (
    <Guard perm="students.edit">
      <PageHeader title="Add Student" description={applicationId ? "Details are pre-filled from the admission application. Please review before saving." : "Register a new student. Fields marked * are required."}
        crumbs={[{ label: "Students", href: "/students" }, { label: "Add Student" }]} />
      <StudentForm initial={initial} applicationId={applicationId} />
      <span className="sr-only">{t("Add Student")}</span>
    </Guard>
  );
}

export function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const db = useDb();
  const { scoped } = useAuth();
  const student = scoped.students.find((s) => s.id === id);
  const full = db.students.find((s) => s.id === id);
  return (
    <Guard perm="students.edit">
      {!student || !full ? (
        <EmptyState title="Student not found" description="This student does not exist or you do not have access." action={<LinkButton href="/students">Students</LinkButton>} />
      ) : (
        <>
          <PageHeader title="Edit Student" crumbs={[{ label: "Students", href: "/students" }, { label: full.fullName, href: `/students/${full.id}` }, { label: "Edit" }]} />
          <StudentForm key={full.id} initial={full} studentId={full.id} />
        </>
      )}
    </Guard>
  );
}
