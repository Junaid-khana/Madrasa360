"use client";
import { Suspense } from "react";
import { Guard } from "@/components/layout/app-shell";
import { FeesPage } from "@/features/fees/fees-page";

export default function Page() {
  return <Guard perm="fees.view"><Suspense><FeesPage /></Suspense></Guard>;
}
