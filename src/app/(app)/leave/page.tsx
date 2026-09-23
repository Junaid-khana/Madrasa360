"use client";
import { Suspense } from "react";
import { LeavePage } from "@/features/leave/leave-page";

export default function Page() {
  return <Suspense><LeavePage /></Suspense>;
}
