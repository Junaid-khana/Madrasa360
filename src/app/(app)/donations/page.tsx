"use client";
import { Suspense } from "react";
import { Guard } from "@/components/layout/app-shell";
import { DonationsPage } from "@/features/donations/donations-page";

export default function Page() {
  return <Guard perm="donations.manage"><Suspense><DonationsPage /></Suspense></Guard>;
}
