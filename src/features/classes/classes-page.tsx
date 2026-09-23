"use client";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import type { ClassRoom, Teacher } from "@/lib/types";
import { ClassesTab } from "./classes-tab";
import { TeachersTab } from "./teachers-tab";

export function ClassesPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const showTeachers = can("classes.manage") || can("teachers.manage");
  const [tab, setTab] = useState(useSearchParams().get("tab") === "teachers" && showTeachers ? "teachers" : "classes");
  const [classDialog, setClassDialog] = useState<{ cls?: ClassRoom } | null>(null);
  const [teacherDialog, setTeacherDialog] = useState<{ teacher?: Teacher } | null>(null);

  return (
    <>
      <PageHeader
        title="Classes" description="Classes, sections, teachers, subjects and timetables." crumbs={[{ label: "Classes" }]}
        actions={tab === "classes"
          ? can("classes.manage") && <Button onClick={() => setClassDialog({})}><Plus className="size-4" />{t("Add class")}</Button>
          : can("teachers.manage") && <Button onClick={() => setTeacherDialog({})}><Plus className="size-4" />{t("Add teacher")}</Button>}
      />
      {showTeachers && <Tabs tabs={[{ id: "classes", label: "Classes" }, { id: "teachers", label: "Teachers" }]} value={tab} onChange={setTab} className="mb-4" />}
      {tab === "classes" ? <ClassesTab dialog={classDialog} setDialog={setClassDialog} /> : <TeachersTab dialog={teacherDialog} setDialog={setTeacherDialog} />}
    </>
  );
}
