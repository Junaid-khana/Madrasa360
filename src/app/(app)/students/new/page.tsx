"use client";
import { Suspense } from "react";
import { NewStudentPage } from "@/features/students/student-form-pages";

export default function Page() {
  return <Suspense><NewStudentPage /></Suspense>;
}
