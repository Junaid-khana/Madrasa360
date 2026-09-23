"use client";
import { Suspense } from "react";
import { Guard } from "@/components/layout/app-shell";
import { CommunicationPage } from "@/features/communication/communication-page";

export default function Page() {
  return <Guard perm="communication.send"><Suspense><CommunicationPage /></Suspense></Guard>;
}
