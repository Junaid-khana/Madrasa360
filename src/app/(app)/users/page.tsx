"use client";
import { Guard } from "@/components/layout/app-shell";
import { UsersPage } from "@/features/users/users-page";

export default function Page() {
  return <Guard perm="users.manage"><UsersPage /></Guard>;
}
