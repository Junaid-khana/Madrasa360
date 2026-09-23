"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/feedback";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useActor } from "@/lib/auth/auth";
import { ROLES, ROLE_LABEL } from "@/lib/auth/permissions";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { createUser, updateUser, userSchema } from "@/lib/services/users";
import type { AppUser, Role } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useState } from "react";

const blank = { name: "", username: "", email: "", role: "admin" as Role, teacherId: "", password: "" };

/** Add a new user, or edit an existing one (no password field when editing — use "Reset password"). */
export function UserFormDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user?: AppUser | null }) {
  const { t } = useI18n();
  const db = useDb();
  const actor = useActor();
  const toast = useToast();
  const f = useForm(userSchema, blank);
  const [busy, setBusy] = useState(false);
  const editing = !!user;

  useEffect(() => {
    if (!open) return;
    f.setValues(user ? { name: user.name, username: user.username, email: user.email, role: user.role, teacherId: user.teacherId ?? "", password: "" } : blank);
    f.setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const role = f.get("role") as Role;
  const linked = new Set(db.users.filter((u) => u.teacherId && u.id !== user?.id).map((u) => u.teacherId));
  const teacherChoices = db.teachers.filter((x) => !linked.has(x.id));

  const submit = async () => {
    const data = f.validate();
    if (!data) { toast.error(t("Please fix the highlighted fields")); return; }
    setBusy(true);
    try {
      if (editing) updateUser(user!.id, data, actor);
      else await createUser(data, actor);
      toast.success(t("Saved successfully"));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Something went wrong. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open} onClose={onClose} title={t(editing ? "Edit user" : "Add user")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button onClick={submit} loading={busy}>{t("Save")}</Button></>}
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label={t("Full name")} required error={f.error("name")}><Input {...f.field("name")} autoFocus /></Field>
          <Field label={t("Username")} required error={f.error("username")}><Input {...f.field("username")} dir="ltr" autoCapitalize="none" /></Field>
          <Field label={t("Email")} error={f.error("email")}><Input type="email" {...f.field("email")} /></Field>
          <Field label={t("Role")} required>
            <Select value={role} onChange={(e) => f.set("role", e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{t(ROLE_LABEL[r])}</option>)}
            </Select>
          </Field>
          {role === "teacher" && (
            <Field label={t("Teacher profile")} required error={f.error("teacherId")} hint={t("Teachers only see their own classes.")}>
              <Select value={f.get("teacherId") as string} onChange={(e) => f.set("teacherId", e.target.value)} error={!!f.error("teacherId")}>
                <option value="">{t("Select…")}</option>
                {teacherChoices.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            </Field>
          )}
          {!editing && (
            <Field label={t("Temporary password")} required error={f.error("password")} hint={t("At least 8 characters. The user should change it after first sign-in.")}>
              <Input type="text" {...f.field("password")} dir="ltr" autoComplete="off" />
            </Field>
          )}
        </FormGrid>
        {role === "super_admin" && <Alert tone="warn">{t("Super Admins can manage everything, including users, settings and backups.")}</Alert>}
      </div>
    </Modal>
  );
}
