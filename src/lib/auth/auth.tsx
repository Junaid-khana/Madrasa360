"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SESSION_KEY } from "../constants";
import { store, useStoreSnapshot } from "../db/store";
import { logActivity } from "../services/activity";
import type { AppUser, Db } from "../types";
import { sha256 } from "../utils";
import { roleCan, scopeDb, type Permission } from "./permissions";

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  login(username: string, password: string, remember: boolean): Promise<{ ok: true } | { ok: false; error: string }>;
  logout(): void;
  can(p: Permission): boolean;
  /** Database limited to what the signed-in user is allowed to see. */
  scoped: Db;
}

const Ctx = createContext<AuthCtx | null>(null);

function readSession(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, db } = useStoreSnapshot();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    store.init();
    setUserId(readSession());
    setChecked(true);
  }, []);

  const user = useMemo(() => {
    const u = db.users.find((x) => x.id === userId) ?? null;
    return u && u.status === "Active" ? u : null; // disabled users lose access immediately
  }, [db.users, userId]);

  const login = useCallback<AuthCtx["login"]>(async (username, password, remember) => {
    store.init();
    const key = username.trim().toLowerCase();
    const u = store.db.users.find((x) => x.username.toLowerCase() === key || x.email.toLowerCase() === key);
    const hash = await sha256(password);
    if (!u || u.passwordHash !== hash) return { ok: false, error: "Incorrect username or password." };
    if (u.status !== "Active") return { ok: false, error: "This account has been disabled. Contact the administrator." };
    store.update((d) => { d.users.find((x) => x.id === u.id)!.lastLogin = new Date().toISOString(); });
    logActivity({ id: u.id, name: u.name }, "auth", "Signed in");
    try {
      sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, u.id);
    } catch { /* storage blocked */ }
    setUserId(u.id);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setUserId(null);
  }, []);

  const can = useCallback((p: Permission) => !!user && roleCan(user.role, p), [user]);
  const scoped = useMemo(() => (user ? scopeDb(db, user) : db), [db, user]);

  const value = useMemo(
    () => ({ user, loading: !checked || !ready, login, logout, can, scoped }),
    [user, checked, ready, login, logout, can, scoped],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

/** The signed-in user as an audit "actor" for service calls: `createStudent(data, useActor())`. */
export function useActor() {
  const { user } = useAuth();
  return { id: user?.id ?? "system", name: user?.name ?? "System" };
}
