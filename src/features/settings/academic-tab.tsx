"use client";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { TagList } from "./tag-list";
import { useSaveSettings } from "./use-save";

export function AcademicTab() {
  const { t } = useI18n();
  const { settings, classes } = useDb();
  const save = useSaveSettings();
  const [year, setYear] = useState(settings.academicYear);
  const [subjects, setSubjects] = useState(settings.subjects);
  const [exams, setExams] = useState(settings.examTypes);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("Academic year")} />
        <CardBody className="max-w-xs"><Field label={t("Academic year")}><Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" dir="ltr" /></Field></CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Classes")} description={t("{n} classes are set up. Add or edit classes, sections, rooms and timetables on the Classes page.", { n: classes.length })}
          action={<LinkButton href="/classes" variant="secondary" size="sm">{t("Manage classes")}<ArrowUpRight className="size-4 rtl:-scale-x-100" /></LinkButton>} />
      </Card>
      <Card>
        <CardHeader title={t("Subjects")} description={t("Subjects offered in the madrasa. Class subjects are chosen from this list.")} />
        <CardBody><TagList items={subjects} onChange={setSubjects} placeholder="Add a subject…" /></CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Exam types")} description={t("For example: Monthly Test, Mid-Term, Final.")} />
        <CardBody><TagList items={exams} onChange={setExams} placeholder="Add an exam type…" /></CardBody>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => save({ academicYear: year.trim() || settings.academicYear, subjects, examTypes: exams }, "Academic settings updated")}>{t("Save changes")}</Button>
      </div>
    </div>
  );
}
