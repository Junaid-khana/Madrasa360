import { z } from "zod";
import { store } from "../db/store";
import type { Donation } from "../types";
import { PK_PHONE, uid } from "../utils";
import { pushActivity, type Actor } from "./activity";

export const donationSchema = z.object({
  donorName: z.string().trim().min(2, "Enter the donor's name"),
  phone: z.string().trim().refine((v) => !v || PK_PHONE.test(v), "Enter a valid Pakistani mobile number").default(""),
  amount: z.coerce.number().positive("Enter the amount"),
  date: z.string().min(1, "Select the date"),
  category: z.enum(["General Donation", "Zakat", "Sadaqah", "Student Sponsorship", "Building Fund", "Food", "Books", "Other"]),
  method: z.enum(["Cash", "JazzCash", "Easypaisa", "Bank Transfer", "Cheque"]),
  purpose: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export function createDonation(input: z.output<typeof donationSchema>, actor: Actor): Donation {
  let saved!: Donation;
  store.update((d) => {
    d.counters.donation += 1;
    saved = { ...input, id: uid("d"), receiptNo: `DON-${input.date.slice(0, 4)}-${String(d.counters.donation).padStart(4, "0")}`, receivedBy: actor.id };
    d.donations.push(saved);
    pushActivity(d, actor, "donation", `Donation Rs ${input.amount.toLocaleString("en-PK")} recorded from ${input.donorName} (${saved.receiptNo})`);
  });
  return saved;
}

export function deleteDonation(id: string, actor: Actor) {
  store.update((d) => {
    const x = d.donations.find((y) => y.id === id);
    d.donations = d.donations.filter((y) => y.id !== id);
    if (x) pushActivity(d, actor, "donation", `Donation ${x.receiptNo} deleted`);
  });
}
