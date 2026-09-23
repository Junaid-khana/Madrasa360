"use client";
import { Copy, KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { Avatar, Ltr } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useActor, useAuth } from "@/lib/auth/auth";
import { ROLES, ROLE_LABEL } from "@/lib/auth/permissions";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { resetPassword, setUserStatus } from "@/lib/services/users";
import type { AppUser } from "@/lib/types";
import { RolesMatrix } from "./roles-matrix";
import { UserFormDialog } from "./user-form-dialog";

const ROLE_TONE = { super_admin: "gold", admin: "green", teacher: "blue", accountant: "gray" } as const;

export function UsersPage() {
  const { t, fmtDateTime } = useI18n();
  const db = useDb();
  const { user: me } = useAuth();
  const actor = useActor();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("users");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<{ open: boolean; user: AppUser | null }>({ open: false, user: null });
  const [temp, setTemp] = useState<{ name: string; password: string } | null>(null);

  const rows = db.users.filter((u) => (!role || u.role === role) && (!status || u.status === status));

  const toggle = async (u: AppUser) => {
    const disabling = u.status === "Active";
    const ok = await confirm({
      title: disabling ? "Disable this account?" : "Enable this account?",
      message: disabling ? "The user will be signed out and cannot sign in until the account is enabled again." : "The user will be able to sign in again.",
      confirmLabel: disabling ? "Disable" : "Enable", tone: disabling ? "danger" : "primary",
    });
    if (!ok) return;
    try { setUserStatus(u.id, disabling ? "Disabled" : "Active", actor); toast.success(t("Saved successfully")); }
    catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };

  const reset = async (u: AppUser) => {
    const ok = await confirm({ title: "Reset password?", message: "A new temporary password will be generated. The old password stops working immediately.", confirmLabel: "Reset password", tone: "danger" });
    if (!ok) return;
    try { setTemp({ name: u.name, password: await resetPassword(u.id, actor) }); }
    catch (e) { toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again.")); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(temp!.password); toast.success(t("Copied")); } catch { toast.error(t("Could not copy — please write it down.")); }
  };

  const cols: Column<AppUser>[] = [
    {
      key: "name", header: "Name", sort: (u) => u.name, text: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" />
          <div className="min-w-0"><p className="truncate font-medium text-stone-900">{u.name}{u.id === me?.id && <span className="ms-2 text-xs font-normal text-stone-400">({t("you")})</span>}</p>
            <p className="truncate text-xs text-stone-500"><Ltr>{u.username}</Ltr>{u.email && <> · <Ltr>{u.email}</Ltr></>}</p></div>
        </div>
      ),
    },
    { key: "role", header: "Role", sort: (u) => u.role, text: (u) => ROLE_LABEL[u.role], cell: (u) => <Badge tone={ROLE_TONE[u.role]}>{t(ROLE_LABEL[u.role])}</Badge> },
    { key: "status", header: "Status", sort: (u) => u.status, text: (u) => u.status, cell: (u) => <StatusBadge status={u.status} /> },
    { key: "last", header: "Last login", hideBelow: "md", sort: (u) => u.lastLogin ?? "", text: (u) => u.lastLogin ?? "", cell: (u) => (u.lastLogin ? fmtDateTime(u.lastLogin) : t("Never")) },
    {
      key: "act", header: "Actions", align: "end",
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, user: u })} aria-label={t("Edit")} title={t("Edit")}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => reset(u)} aria-label={t("Reset password")} title={t("Reset password")}><KeyRound className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggle(u)} disabled={u.id === me?.id} aria-label={t(u.status === "Active" ? "Disable" : "Enable")} title={t(u.status === "Active" ? "Disable" : "Enable")}>
            {u.status === "Active" ? <UserX className="size-4 text-red-600" /> : <UserCheck className="size-4 text-brand-700" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Users" description="Manage who can sign in and what they can do." crumbs={[{ label: "Users" }]}
        actions={<Button onClick={() => setForm({ open: true, user: null })}><Plus className="size-4" />{t("Add user")}</Button>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: "users", label: "Users" }, { id: "roles", label: "Roles & permissions" }]} />

      {tab === "users" ? (
        <DataTable
          columns={cols} rows={rows} rowKey={(u) => u.id} searchText={(u) => `${u.name} ${u.username} ${u.email}`} searchPlaceholder="Search users…" exportName="users"
          toolbar={<>
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto" aria-label={t("Role")}><option value="">{t("All roles")}</option>{ROLES.map((r) => <option key={r} value={r}>{t(ROLE_LABEL[r])}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label={t("Status")}><option value="">{t("All statuses")}</option><option value="Active">{t("Active")}</option><option value="Disabled">{t("Disabled")}</option></Select>
          </>}
          renderCard={(u) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2"><Avatar name={u.name} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium">{u.name}</p><p className="text-xs text-stone-500"><Ltr>{u.username}</Ltr></p></div></div>
                <StatusBadge status={u.status} />
              </div>
              <div className="flex items-center justify-between">
                <Badge tone={ROLE_TONE[u.role]}>{t(ROLE_LABEL[u.role])}</Badge>
                <div className="flex" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, user: u })} aria-label={t("Edit")}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => reset(u)} aria-label={t("Reset password")}><KeyRound className="size-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggle(u)} disabled={u.id === me?.id} aria-label={t("Disable")}>{u.status === "Active" ? <UserX className="size-4 text-red-600" /> : <UserCheck className="size-4 text-brand-700" />}</Button>
                </div>
              </div>
            </div>
          )}
        />
      ) : <RolesMatrix />}

      <UserFormDialog open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} />

      <Modal open={!!temp} onClose={() => setTemp(null)} size="sm" title={t("Temporary password")} description={temp?.name}
        footer={<Button onClick={() => setTemp(null)}>{t("Done")}</Button>}>
        <p className="text-sm text-stone-600">{t("Share this password with the user privately. It is shown only once and they should change it after signing in.")}</p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <code dir="ltr" className="flex-1 select-all text-lg font-semibold tracking-wider text-stone-900">{temp?.password}</code>
          <Button variant="secondary" size="sm" onClick={copy}><Copy className="size-4" />{t("Copy")}</Button>
        </div>
      </Modal>
    </>
  );
}
