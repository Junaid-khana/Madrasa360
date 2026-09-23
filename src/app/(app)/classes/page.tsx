"use client";
import { Suspense } from "react";
import { ClassesPage } from "@/features/classes/classes-page";

export default function Page() {
  return <Suspense><ClassesPage /></Suspense>;
}
