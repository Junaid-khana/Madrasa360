"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth";
import { ClassReportTab } from "./class-report";
import { EnterResults } from "./enter-results";
import { ExamSummaryTab } from "./exam-summary";
import { ResultCardTab } from "./result-card";
import { ResultsTable } from "./results-table";

export function ExamsPage() {
  const { can } = useAuth();
  const canRecord = can("academics.record");
  const requested = useSearchParams().get("tab");
  const [tab, setTab] = useState(requested ?? (canRecord ? "enter" : "results"));
  return (
    <>
      <PageHeader title="Exams & Results" description="Enter marks, view results and print result cards." crumbs={[{ label: "Exams & Results" }]} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { id: "enter", label: "Enter Results", hidden: !canRecord },
        { id: "results", label: "Results" },
        { id: "card", label: "Result Card" },
        { id: "class", label: "Class Report" },
        { id: "summary", label: "Exam Summary" },
      ]} />
      {tab === "enter" && canRecord && <EnterResults />}
      {tab === "results" && <ResultsTable />}
      {tab === "card" && <ResultCardTab />}
      {tab === "class" && <ClassReportTab />}
      {tab === "summary" && <ExamSummaryTab />}
    </>
  );
}
