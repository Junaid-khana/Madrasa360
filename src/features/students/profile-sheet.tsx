"use client";
import type { ReactNode } from "react";
import { PrintSheet, PrintTable, SignatureLine } from "@/components/print/print";
import { useAuth } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { studentAttendance } from "@/lib/services/attendance";
import { buildLedger } from "@/lib/services/fees";
import { classLabel, getClass, getTeacher, hifzProgressPercent } from "@/lib/services/students";
import { calcAge, sum } from "@/lib/utils";

function Pairs({ title, items }: { title: string; items: [string, ReactNode][] }) {
  const { t } = useI18n();
  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className="mb-1 border-b border-stone-400 text-[12px] font-bold uppercase">{t(title)}</h2>
      <table className="w-full text-[11px]"><tbody>
        {Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => (
          <tr key={i}>
            {[items[i * 2], items[i * 2 + 1]].map((it, j) => it
              ? [<td key={`l${j}`} className="w-[17%] py-0.5 pe-2 text-stone-600">{t(it[0])}</td>, <td key={`v${j}`} className="w-[33%] py-0.5 pe-3 font-medium">{it[1] || "—"}</td>]
              : [<td key={`l${j}`} />, <td key={`v${j}`} />])}
          </tr>
        ))}
      </tbody></table>
    </section>
  );
}

/** Printable student profile (A4). Sections follow the user's permissions (no fee data for teachers, etc.). */
export function StudentProfileSheet({ studentId }: { studentId: string }) {
  const { t, fmtDate, fmtMoney, fmtNum } = useI18n();
  const { scoped, can } = useAuth();
  const s = scoped.students.find((x) => x.id === studentId);
  if (!s) return null;
  const cls = getClass(scoped, s.classId);
  const teacher = cls ? getTeacher(scoped, cls.teacherId) : undefined;
  const att = studentAttendance(scoped, s.id);
  const ledger = buildLedger(scoped).filter((r) => r.record.studentId === s.id).sort((a, b) => b.record.month.localeCompare(a.record.month));
  const showHifz = can("hifz.view") && s.hifz.status !== "Not Started";

  return (
    <PrintSheet title="Student Profile" subtitle={<>{s.fullName} — {s.id}</>}>
      <div className="mb-4 flex items-start gap-4">
        {s.photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={s.photo} alt="" className="h-28 w-24 rounded border border-stone-300 object-cover" />
          : <div className="flex h-28 w-24 items-center justify-center rounded border border-dashed border-stone-400 text-[10px] text-stone-500">{t("Photo")}</div>}
        <div className="flex-1">
          <Pairs title="Personal Information" items={[
            ["Student ID", s.id], ["Full name", s.fullName], ["Father's name", s.fatherName], ["Gender", t(s.gender)],
            ["Date of birth", `${fmtDate(s.dob)} (${fmtNum(calcAge(s.dob))} ${t("years")})`], ["B-Form / CNIC reference", s.bForm],
            ["Address", s.address], ["City", `${s.city}, ${t(s.province)}`],
          ]} />
        </div>
      </div>
      <Pairs title="Guardian Information" items={[
        ["Guardian name", s.guardian.name], ["Relationship", t(s.guardian.relationship)], ["Phone", s.guardian.phone],
        ["Alternate phone", s.guardian.altPhone], ["Email", s.guardian.email], ["Address", s.guardian.address || s.address],
      ]} />
      <Pairs title="Madrasa Information" items={[
        ["Class", classLabel(cls)], ["Teacher", teacher?.name], ["Admission date", fmtDate(s.admissionDate)], ["Student status", t(s.status)],
        ["Hostel / Day scholar", t(s.residence)], ["Previous school / madrasa", s.previousSchool],
        ...(can("fees.view") ? [["Monthly fee", fmtMoney(s.monthlyFee)], ["Discount", fmtMoney(s.discount)]] as [string, ReactNode][] : []),
      ]} />
      <Pairs title="Religious Education" items={[
        ["Nazra status", t(s.nazraStatus)], ["Hifz status", t(s.hifz.status)],
        ...(showHifz ? [
          ["Current Para", fmtNum(s.hifz.currentPara)], ["Current Surah", s.hifz.currentSurah], ["Paras memorised", `${fmtNum(s.hifz.parasCompleted)} / 30 (${fmtNum(hifzProgressPercent(s))}%)`],
          ["Hifz start date", fmtDate(s.hifz.startDate)], ["Daily lesson (Sabaq)", s.hifz.dailyLesson], ["Previous lesson (Sabqi)", s.hifz.previousLesson],
          ["Revision (Manzil)", s.hifz.revision], ["Teacher remarks", s.hifz.remarks],
        ] as [string, ReactNode][] : []),
      ]} />
      {can("attendance.view") && (
        <Pairs title="Attendance Summary" items={[
          ["Present", fmtNum(att.present)], ["Absent", fmtNum(att.absent)], ["On leave", fmtNum(att.leave)], ["Attendance percentage", `${fmtNum(att.percent)}%`],
        ]} />
      )}
      {can("fees.view") && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 border-b border-stone-400 text-[12px] font-bold uppercase">{t("Fee Summary")}</h2>
          <p className="mb-1 text-[11px]">
            {t("Billed")}: <b>{fmtMoney(sum(ledger.map((r) => r.net)))}</b> · {t("Paid")}: <b>{fmtMoney(sum(ledger.map((r) => r.paid)))}</b> · {t("Outstanding")}: <b>{fmtMoney(sum(ledger.map((r) => r.balance)))}</b>
          </p>
          {ledger.length > 0 && (
            <PrintTable headers={["Month", "Description", "Amount", "Paid", "Status"]}
              rows={ledger.slice(0, 8).map((r) => [r.record.month, r.record.description, fmtMoney(r.net), fmtMoney(r.paid), t(r.status)])} />
          )}
        </section>
      )}
      <div className="mt-10 flex justify-between">
        <SignatureLine label="Guardian signature" />
        <SignatureLine label="Principal / Administrator" />
      </div>
    </PrintSheet>
  );
}
