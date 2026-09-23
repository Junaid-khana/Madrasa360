"use client";
import { Suspense } from "react";
import { ExamsPage } from "@/features/exams/exams-page";

export default function Page() {
  return <Suspense><ExamsPage /></Suspense>;
}
