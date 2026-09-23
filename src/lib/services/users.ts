import { z } from "zod";
import { store } from "../db/store";
import type { AppUser, Role } from "../types";
import { sha256, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";

export const userSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name"),
  username: z.string().trim().min(3, "At least 3 characters").regex(/^[a-z0-9._-]+$/i, "Letters, numbers, dot, dash or underscore only"),
  email: z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email").default(""),
  role: z.enum(["super_admin", "admin", "teacher", "accountant"]),
  teacherId: z.string().default(""),
  password: z.string().default(""),
}).refine((u) => u.role !== "teacher" || !!u.teacherId, { path: ["teacherId"], message: "Link this account to a teacher profile" });

export const passwordRule = z.string().min(8, "Use at least 8 characters");

const activeSuperAdmins = (users: AppUser[], exceptId?: string) =>
  users.filter((u) => u.role === "super_admin" && u.status === "Active" && u.id !== exceptId).length;

export async function createUser(input: z.output<typeof userSchema>, actor: Actor) {
  const parsed = passwordRule.safeParse(input.password);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const hash = await sha256(input.password);
  store.update((d) => {
    if (d.users.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) throw new Error("This username is already taken");
    d.users.push({
      id: uid("u"), name: input.name, username: input.username, email: input.email, role: input.role as Role,
      status: "Active", lastLogin: null, passwordHash: hash, teacherId: input.role === "teacher" ? input.teacherId : undefined,
      mustChangePassword: true,
    });
    pushActivity(d, actor, "user", `User account created — ${input.name} (${input.role})`);
  });
}

export function updateUser(id: string, input: Omit<z.output<typeof userSchema>, "password">, actor: Actor) {
  store.update((d) => {
    const u = d.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    if (d.users.some((x) => x.id !== id && x.username.toLowerCase() === input.username.toLowerCase())) throw new Error("This username is already taken");
    if (u.role === "super_admin" && input.role !== "super_admin" && activeSuperAdmins(d.users, id) === 0) throw new Error("There must be at least one active Super Admin");
    Object.assign(u, { name: input.name, username: input.username, email: input.email, role: input.role, teacherId: input.role === "teacher" ? input.teacherId : undefined });
    pushActivity(d, actor, "user", `User account updated — ${u.name}`);
  });
}

export function setUserStatus(id: string, status: AppUser["status"], actor: Actor) {
  store.update((d) => {
    const u = d.users.find((x) => x.id === id);
    if (!u) return;
    if (status === "Disabled") {
      if (u.id === actor.id) throw new Error("You cannot disable your own account");
      if (u.role === "super_admin" && activeSuperAdmins(d.users, id) === 0) throw new Error("There must be at least one active Super Admin");
    }
    u.status = status;
    pushActivity(d, actor, "user", `User account ${status === "Active" ? "enabled" : "disabled"} — ${u.name}`);
  });
}

/** Generates a temporary password, shown once to the administrator. */
export async function resetPassword(id: string, actor: Actor): Promise<string> {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const temp = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const hash = await sha256(temp);
  store.update((d) => {
    const u = d.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    u.passwordHash = hash; u.mustChangePassword = true;
    pushActivity(d, actor, "user", `Password reset for ${u.name}`);
  });
  return temp;
}

export async function changeOwnPassword(id: string, current: string, next: string, actor: Actor) {
  const rule = passwordRule.safeParse(next);
  if (!rule.success) throw new Error(rule.error.issues[0].message);
  const [curHash, nextHash] = await Promise.all([sha256(current), sha256(next)]);
  store.update((d) => {
    const u = d.users.find((x) => x.id === id);
    if (!u || u.passwordHash !== curHash) throw new Error("Current password is incorrect");
    u.passwordHash = nextHash; u.mustChangePassword = false;
    pushActivity(d, actor, "auth", "Password changed");
  });
}
