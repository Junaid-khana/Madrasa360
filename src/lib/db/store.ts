/**
 * Data layer entry point.
 *
 * The UI never touches storage directly: it reads a `Db` snapshot through `useDb()` and
 * mutates it only through the service modules in `src/lib/services/*`, which call `store.update()`.
 *
 * To connect a real database (PostgreSQL / Supabase), implement `PersistenceAdapter`
 * (see docs/schema.sql for the matching tables) — or replace the service functions with
 * API calls. Nothing above the services layer needs to change.
 */
import { useSyncExternalStore } from "react";
import { DB_VERSION, STORAGE_KEY } from "../constants";
import { buildSeed } from "../seed";
import type { Db } from "../types";

export interface PersistenceAdapter {
  load(): Db | null;
  save(db: Db): void;
  clear(): void;
}

class LocalStorageAdapter implements PersistenceAdapter {
  load(): Db | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const db = JSON.parse(raw) as Db;
      return db.version === DB_VERSION ? db : null;
    } catch {
      return null;
    }
  }
  save(db: Db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Could not persist data locally", e);
    }
  }
  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

const EMPTY: Db = {
  version: DB_VERSION,
  settings: {
    madrasaName: "", madrasaNameUr: "", logo: "", address: "", phone: "", email: "", website: "", principal: "",
    academicYear: "", subjects: [], examTypes: [], defaultMonthlyFee: 0, admissionFee: 0, examFee: 0,
    feeCategories: [], discountPresets: [], sms: { provider: "none", senderId: "", apiKey: "" },
    notifications: { feeReminders: true, absenceAlerts: true, leaveRequests: true, backupReminder: true },
  },
  backup: { lastBackupAt: null, lastExportAt: null, auto: false },
  counters: { student: 0, receipt: 0, donation: 0, application: 0 },
  users: [], teachers: [], classes: [], students: [], attendance: [], fees: [], payments: [], donations: [],
  hifz: [], results: [], leaves: [], messages: [], applications: [], documents: [], activity: [],
};

interface Snapshot { ready: boolean; db: Db }

class Store {
  private snap: Snapshot = { ready: false, db: EMPTY };
  private listeners = new Set<() => void>();
  private adapter: PersistenceAdapter = new LocalStorageAdapter();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  getSnapshot = () => this.snap;
  /** Must be constant: hydration (incl. late Suspense boundaries) has to see the same empty state the server rendered. */
  private serverSnap: Snapshot = { ready: false, db: EMPTY };
  getServerSnapshot = () => this.serverSnap;
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };

  /** Load persisted data (or seed demo data on first run). Safe to call repeatedly. */
  init() {
    if (this.snap.ready || typeof window === "undefined") return;
    const db = this.adapter.load() ?? buildSeed();
    this.snap = { ready: true, db };
    if (!this.adapter.load()) this.adapter.save(db);
    this.emit();
  }

  get db() { return this.snap.db; }

  /** Apply a mutation to a cloned copy of the database, persist, and notify subscribers. */
  update(mutator: (draft: Db) => void) {
    const draft = structuredClone(this.snap.db);
    mutator(draft);
    this.replace(draft);
  }

  replace(db: Db) {
    this.snap = { ready: true, db };
    this.emit();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.adapter.save(this.snap.db), 250);
  }

  resetToDemo() {
    this.adapter.clear();
    this.replace(buildSeed());
  }

  private emit() { this.listeners.forEach((l) => l()); }
}

export const store = new Store();

export function useStoreSnapshot(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
/** Current database snapshot. Pages render only after the store is ready (see AppShell). */
export function useDb(): Db {
  return useStoreSnapshot().db;
}
