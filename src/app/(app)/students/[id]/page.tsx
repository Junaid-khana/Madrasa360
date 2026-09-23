"use client";
import { Suspense } from "react";
import { StudentProfile } from "@/features/students/student-profile";

export default function Page() {
  return <Suspense><StudentProfile /></Suspense>;
}
