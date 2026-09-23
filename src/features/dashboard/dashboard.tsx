"use client";
import {
  AlertCircle, BookOpen, CalendarCheck, ClipboardCheck, Coins, FileBarChart, GraduationCap, HandCoins, HeartHandshake, School,
  UserCheck, UserPlus, Users, Wallet, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Alert, Avatar, Ltr, ProgressBar, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import type { Permission } from "@/lib/auth/permissions";
import { useI18n } from "@/lib/i18n";
import { classLabel, getClass } from "@/lib/services/students";
import type { ActivityKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttendanceTrendChart, DistributionChart, EnrollmentChart, FeeCollectionChart, HifzBucketsChart } from "./charts";
import { computeDashboard } from "./data";

interface QuickAction { href: string; label: string; icon: LucideIcon; perm: Permission }
const ACTIONS: QuickAction[] = [
  { href: "/students/new", label: "Add Student", icon: UserPlus, perm: "students.edit" },
  { href: "/attendance", label: "Mark Attendance", icon: ClipboardCheck, perm: "attendance.mark" },
  { href: "/fees?collect=1", label: "Collect Fee", icon: Wallet, perm: "fees.manage" },
  { href: "/hifz?add=1", label: "Record Hifz Progress", icon: BookOpen, perm: "hifz.record" },
  { href: "/donations?add=1", label: "Add Donation", icon: HeartHandshake, perm: "donations.manage" },
  { href: "/reports", label: "Generate Report", icon: FileBarChart, perm: "reports.view" },
];

/** Which permission lets a user see an activity entry (so accountants don't read attendance chatter, etc.). */
const ACTIVITY_PERM: Record<ActivityKind, Permission> = {
  student: "students.view", fee: "fees.view", attendance: "attendance.view", hifz: "hifz.view", donation: "donations.manage",
  exam: "academics.view", leave: "leave.view", communication: "communication.send", admission: "admissions.manage",
  class: "classes.view", user: "users.manage", settings: "settings.manage", auth: "users.manage", data: "data.manage",
};
const KIND_STYLE: Partial<Record<ActivityKind, string>> = {
  student: "bg-brand-100 text-brand-700", fee: "bg-gold-100 text-gold-700", donation: "bg-gold-100 text-gold-700",
  attendance: "bg-sky-100 text-sky-700", hifz: "bg-brand-100 text-brand-700", leave: "bg-sky-100 text-sky-700",
};

export function Dashboard() {
  const { t, fmtNum, fmtMoney, fmtDateTime } = useI18n();
  const { user, can, scoped } = useAuth();
  const d = useMemo(() => computeDashboard(scoped), [scoped]);
  const isTeacher = user?.role === "teacher";
  const seeStudents = can("students.edit") || isTeacher;
  const seeFees = can("fees.view");
  const attendance = d.day.counts;

  const timeAgo = (iso: string) => {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 2) return t("Just now");
    if (mins < 60) return t("{n} min ago", { n: mins });
    if (mins < 60 * 24) return t("{n} h ago", { n: Math.round(mins / 60) });
    return t("{n} d ago", { n: Math.round(mins / 1440) });
  };

  const activity = scoped.activity.filter((a) => can(ACTIVITY_PERM[a.kind])).filter((a) => !isTeacher || a.userId === user?.id || ["attendance", "hifz", "exam"].includes(a.kind)).slice(0, 8);
  const actions = ACTIONS.filter((a) => can(a.perm));
  const pending = d.day.pendingClasses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">{t("Assalam o Alaikum")}, {user?.name}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("Here is today's overview of the madrasa.")}</p>
      </div>

      {actions.length > 0 && (
        <section aria-label={t("Quick Actions")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {actions.map((a) => (
              <Link key={a.href} href={a.href} className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(20,40,30,0.04)] transition hover:border-brand-300 hover:bg-brand-50/50">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white group-hover:bg-brand-900"><a.icon className="size-5" /></span>
                <span className="text-sm font-medium leading-tight text-stone-800">{t(a.label)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {can("attendance.mark") && pending.length > 0 && (
        <Alert tone="warn" className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2"><AlertCircle className="size-4" />{t("Attendance pending for")} {fmtNum(pending.length)} {t("class(es)")}: {pending.slice(0, 3).map((id) => classLabel(getClass(scoped, id))).join("، ")}{pending.length > 3 ? "…" : ""}</span>
          <Link href="/attendance" className="font-semibold underline">{t("Mark Attendance")}</Link>
        </Alert>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {seeStudents && <>
          <Stat label="Total Students" value={fmtNum(d.active)} icon={<GraduationCap className="size-5" />} />
          <Stat label="Male Students" value={fmtNum(d.male)} icon={<Users className="size-5" />} sub={`${d.active ? Math.round((d.male / d.active) * 100) : 0}%`} />
          <Stat label="Female Students" value={fmtNum(d.female)} icon={<Users className="size-5" />} tone="gold" sub={`${d.active ? Math.round((d.female / d.active) * 100) : 0}%`} />
        </>}
        {can("classes.view") && <>
          {!isTeacher && <Stat label="Active Teachers" value={fmtNum(d.teachers)} icon={<UserCheck className="size-5" />} tone="blue" />}
          <Stat label={isTeacher ? "My classes" : "Total Classes"} value={fmtNum(d.classes)} icon={<School className="size-5" />} tone="blue" />
        </>}
        {can("attendance.view") && (
          <Stat
            label="Today's Attendance" icon={<CalendarCheck className="size-5" />}
            value={attendance.total ? `${attendance.percent}%` : "—"}
            sub={attendance.total ? `${t("Present")} ${fmtNum(attendance.present)} · ${t("Absent")} ${fmtNum(attendance.absent)} · ${t("Leave")} ${fmtNum(attendance.leave)}` : t("Attendance not yet marked")}
            tone={attendance.total && attendance.percent < 85 ? "red" : "green"}
          />
        )}
        {seeFees && <>
          <Stat label="Fees Collected This Month" value={fmtMoney(d.finance.monthCollection)} icon={<Wallet className="size-5" />} sub={`${t("Today's collection")}: ${fmtMoney(d.finance.todayCollection)}`} />
          <Stat label="Outstanding Fees" value={fmtMoney(d.finance.outstanding)} icon={<Coins className="size-5" />} tone="red" sub={`${fmtNum(d.finance.unpaidStudents)} ${t("Unpaid students").toLowerCase()}`} />
        </>}
        {can("donations.manage") && <Stat label="Donations This Month" value={fmtMoney(d.finance.donationsMonth)} icon={<HandCoins className="size-5" />} tone="gold" />}
        {can("hifz.view") && (
          <Stat label="Students in Hifz" value={fmtNum(d.hifz.inProgress)} icon={<BookOpen className="size-5" />} tone="gold"
            sub={`${t("Average progress")}: ${d.hifz.avgProgress}% · ${t("Recorded today")}: ${fmtNum(d.hifz.recordedToday)}`} />
        )}
      </section>

      {can("attendance.view") && (
        <Card>
          <CardHeader title={t("Absent today")} description={attendance.total ? `${fmtNum(d.day.absentees.length)} / ${fmtNum(attendance.total)}` : t("Attendance not yet marked")}
            action={<Link href="/attendance" className="text-sm font-medium text-brand-700 hover:underline">{t("View all")}</Link>} />
          <CardBody>
            {d.day.absentees.length === 0 ? <p className="text-sm text-stone-500">{attendance.total ? t("Everyone marked so far is present") : t("Attendance not yet marked")}</p> : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.day.absentees.slice(0, 9).map((s) => (
                  <li key={s.id}>
                    <Link href={`/students/${s.id}`} className="flex items-center gap-3 rounded-lg border border-stone-100 p-2 hover:bg-stone-50">
                      <Avatar name={s.fullName} src={s.photo} size="sm" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{s.fullName}</span>
                        <span className="block truncate text-xs text-stone-500">{classLabel(getClass(scoped, s.classId))} · <Ltr>{s.guardian.phone}</Ltr></span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {d.day.absentees.length > 9 && <p className="mt-3 text-xs text-stone-500">+ {fmtNum(d.day.absentees.length - 9)}</p>}
          </CardBody>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {seeStudents && <DistributionChart data={d.perClass} />}
        {can("attendance.view") && <AttendanceTrendChart data={d.trend} />}
        {seeFees && <FeeCollectionChart data={d.feeMonths} />}
        {can("hifz.view") && <HifzBucketsChart data={d.hifz.buckets} />}
        {seeStudents && !isTeacher && <EnrollmentChart data={d.enrollment} />}

        <Card className={cn(seeStudents && !isTeacher ? "" : "lg:col-span-1")}>
          <CardHeader title={t("Recent Activity")} />
          <CardBody className="pt-3">
            {activity.length === 0 ? <EmptyState title="Nothing to show yet." description="" className="py-6" /> : (
              <ul className="divide-y divide-stone-100">
                {activity.map((a) => {
                  const inner = (
                    <div className="flex items-start gap-3 py-2.5">
                      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", KIND_STYLE[a.kind] ?? "bg-stone-100 text-stone-600")}>{a.userName.replace(/^(Qari|Hafiz|Maulana|Ustaniyah|Sir|Hafiza|Mr\.?|Dr\.?)\s+/i, "").slice(0, 1)}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm text-stone-800">{a.text}</p><p className="mt-0.5 text-xs text-stone-500">{a.userName} · {timeAgo(a.at)} · {fmtDateTime(a.at)}</p></div>
                    </div>
                  );
                  const link = a.refId && can("students.view") && scoped.students.some((s) => s.id === a.refId);
                  return <li key={a.id}>{link ? <Link href={`/students/${a.refId}`} className="block hover:bg-stone-50">{inner}</Link> : inner}</li>;
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      {seeFees && (
        <Card>
          <CardHeader title={t("Fees at a glance")} action={<Link href="/fees" className="text-sm font-medium text-brand-700 hover:underline">{t("View all")}</Link>} />
          <CardBody className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-stone-600">{t("Collected")} / {t("Billed")}</span><span className="tabular font-medium">{fmtMoney(d.finance.monthCollection)} / {fmtMoney(d.finance.monthBilled)}</span></div>
            <ProgressBar value={d.finance.monthBilled ? (d.finance.monthCollection / d.finance.monthBilled) * 100 : 0} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
