"use client";
import { useMemo } from "react";
import { useDb } from "@/lib/db/store";
import { buildLedger, type LedgerRow } from "@/lib/services/fees";
import { classLabel, getClass } from "@/lib/services/students";
import type { Db } from "@/lib/types";

/** Ledger (every charge with paid/balance/status) for the whole database. */
export function useLedger(): LedgerRow[] {
  const db = useDb();
  return useMemo(() => buildLedger(db), [db]);
}

export const studentClass = (db: Db, row: LedgerRow) =>
  row.student ? classLabel(getClass(db, row.student.classId)) : "—";
