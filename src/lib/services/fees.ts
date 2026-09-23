import { z } from "zod";
import { store } from "../db/store";
import type { Db, FeeCategory, FeeRecord, FeeStatus, Payment, PaymentMethod, Student } from "../types";
import { monthOf, nowISO, sum, todayISO, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";

export const feeNet = (f: Pick<FeeRecord, "amount" | "discount" | "waived">) => (f.waived ? 0 : Math.max(0, f.amount - f.discount));

export interface LedgerRow {
  record: FeeRecord;
  student?: Student;
  net: number;
  paid: number;
  balance: number;
  status: FeeStatus;
}

export function feeStatus(f: FeeRecord, paid: number): FeeStatus {
  if (f.waived || feeNet(f) === 0) return "Waived";
  if (paid >= feeNet(f)) return "Paid";
  return paid > 0 ? "Partially Paid" : "Unpaid";
}

/** Sum of allocated payments per fee record. */
export function paidByFee(db: Db): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of db.payments) for (const a of p.allocations) m.set(a.feeId, (m.get(a.feeId) ?? 0) + a.amount);
  return m;
}

/** Every charge with its computed paid amount, balance and status. Memoise on `db.fees`/`db.payments`. */
export function buildLedger(db: Db): LedgerRow[] {
  const paid = paidByFee(db);
  const students = new Map(db.students.map((s) => [s.id, s]));
  return db.fees.map((record) => {
    const p = paid.get(record.id) ?? 0;
    const net = feeNet(record);
    return { record, student: students.get(record.studentId), net, paid: p, balance: Math.max(0, net - p), status: feeStatus(record, p) };
  });
}

export function outstandingByStudent(ledger: LedgerRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of ledger) if (r.balance > 0) m.set(r.record.studentId, (m.get(r.record.studentId) ?? 0) + r.balance);
  return m;
}

export interface FinanceStats {
  todayCollection: number;
  monthCollection: number;
  outstanding: number;
  unpaidStudents: number;
  monthBilled: number;
  donationsMonth: number;
  donationsToday: number;
}
export function financeStats(db: Db, today = todayISO()): FinanceStats {
  const month = monthOf(today);
  const ledger = buildLedger(db);
  const out = outstandingByStudent(ledger);
  return {
    todayCollection: sum(db.payments.filter((p) => p.date === today).map((p) => p.amount)),
    monthCollection: sum(db.payments.filter((p) => monthOf(p.date) === month).map((p) => p.amount)),
    outstanding: sum([...out.values()]),
    unpaidStudents: out.size,
    monthBilled: sum(ledger.filter((r) => r.record.month === month).map((r) => r.net)),
    donationsMonth: sum(db.donations.filter((d) => monthOf(d.date) === month).map((d) => d.amount)),
    donationsToday: sum(db.donations.filter((d) => d.date === today).map((d) => d.amount)),
  };
}

/* ---------- mutations ---------- */
export const paymentSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  feeIds: z.array(z.string()).min(1, "Select at least one charge"),
  amount: z.coerce.number().positive("Enter the amount received"),
  method: z.enum(["Cash", "JazzCash", "Easypaisa", "Bank Transfer", "Cheque"]),
  date: z.string().min(1, "Select the payment date"),
  note: z.string().default(""),
});
export type PaymentInput = z.input<typeof paymentSchema>;

/** Record a payment; allocates to the selected charges oldest-first. Returns the saved payment (with receipt number). */
export function collectPayment(input: z.output<typeof paymentSchema>, actor: Actor): Payment {
  let saved!: Payment;
  store.update((d) => {
    const ledger = buildLedger(d).filter((r) => input.feeIds.includes(r.record.id) && r.record.studentId === input.studentId && r.balance > 0);
    const totalDue = sum(ledger.map((r) => r.balance));
    if (!ledger.length) throw new Error("Nothing outstanding on the selected charges");
    if (input.amount > totalDue) throw new Error(`Amount exceeds the outstanding balance (Rs ${totalDue.toLocaleString("en-PK")})`);
    ledger.sort((a, b) => a.record.month.localeCompare(b.record.month) || a.record.createdAt.localeCompare(b.record.createdAt));
    let left = input.amount;
    const allocations: Payment["allocations"] = [];
    for (const r of ledger) {
      if (left <= 0) break;
      const a = Math.min(left, r.balance);
      allocations.push({ feeId: r.record.id, amount: a });
      left -= a;
    }
    d.counters.receipt += 1;
    saved = {
      id: uid("p"), receiptNo: `RCP-${input.date.slice(0, 4)}-${String(d.counters.receipt).padStart(4, "0")}`,
      studentId: input.studentId, date: input.date, amount: input.amount, method: input.method as PaymentMethod,
      allocations, receivedBy: actor.id, note: input.note,
    };
    d.payments.push(saved);
    const s = d.students.find((x) => x.id === input.studentId);
    pushActivity(d, actor, "fee", `Fee payment received — Rs ${input.amount.toLocaleString("en-PK")} from ${s?.fullName ?? input.studentId} (${saved.receiptNo})`, input.studentId);
  });
  return saved;
}

export const chargeSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
  month: z.string().min(1, "Select the fee month"),
  category: z.enum(["Monthly Fee", "Admission Fee", "Exam Fee", "Other"]),
  description: z.string().trim().min(2, "Enter a description"),
  amount: z.coerce.number().positive("Enter the amount"),
  discount: z.coerce.number().min(0).default(0),
}).refine((c) => c.discount <= c.amount, { path: ["discount"], message: "Discount cannot exceed the amount" });

export function addCharges(input: z.output<typeof chargeSchema>, actor: Actor) {
  store.update((d) => {
    for (const sid of input.studentIds) {
      d.fees.push({
        id: uid("f"), studentId: sid, month: input.month, category: input.category as FeeCategory,
        description: input.description, amount: input.amount, discount: input.discount, waived: false, createdAt: nowISO(),
      });
    }
    pushActivity(d, actor, "fee", `${input.category} "${input.description}" added for ${input.studentIds.length} student(s)`);
  });
}

/** Create the monthly fee charge for every active student that does not have one yet. Returns how many were created. */
export function generateMonthlyFees(month: string, actor: Actor): number {
  let n = 0;
  store.update((d) => {
    for (const s of d.students.filter((x) => x.status === "Active")) {
      if (s.admissionDate.slice(0, 7) > month) continue;
      if (d.fees.some((f) => f.studentId === s.id && f.month === month && f.category === "Monthly Fee")) continue;
      const waived = s.discount >= s.monthlyFee && s.monthlyFee > 0;
      d.fees.push({ id: uid("f"), studentId: s.id, month, category: "Monthly Fee", description: `Monthly fee ${month}`, amount: s.monthlyFee, discount: s.discount, waived, createdAt: nowISO() });
      n++;
    }
    pushActivity(d, actor, "fee", `Monthly fees generated for ${month} (${n} students)`);
  });
  return n;
}

export function setWaived(feeId: string, waived: boolean, actor: Actor) {
  store.update((d) => {
    const f = d.fees.find((x) => x.id === feeId);
    if (!f) return;
    f.waived = waived;
    pushActivity(d, actor, "fee", `${waived ? "Waived" : "Un-waived"} ${f.description} for ${f.studentId}`, f.studentId);
  });
}

/** Everything needed to print a fee receipt. */
export function receiptView(db: Db, paymentId: string) {
  const idx = db.payments.findIndex((p) => p.id === paymentId);
  const payment = db.payments[idx];
  if (!payment) return null;
  const student = db.students.find((s) => s.id === payment.studentId);
  // balances as they stood right after this receipt (only payments up to this one)
  const upTo = db.payments.slice(0, idx + 1);
  const paidUpTo = new Map<string, number>();
  for (const p of upTo) for (const a of p.allocations) paidUpTo.set(a.feeId, (paidUpTo.get(a.feeId) ?? 0) + a.amount);
  const lines = payment.allocations.map((a) => {
    const fee = db.fees.find((f) => f.id === a.feeId)!;
    return { fee, paid: a.amount, remaining: Math.max(0, feeNet(fee) - (paidUpTo.get(fee.id) ?? 0)) };
  });
  return {
    payment, student, lines,
    gross: sum(lines.map((l) => l.fee.amount)),
    discount: sum(lines.map((l) => l.fee.discount)),
    remaining: sum(lines.map((l) => l.remaining)),
    receivedBy: db.users.find((u) => u.id === payment.receivedBy)?.name ?? "",
  };
}
export type ReceiptView = NonNullable<ReturnType<typeof receiptView>>;
