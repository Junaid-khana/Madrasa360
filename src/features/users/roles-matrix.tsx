"use client";
import { Check, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ALL_PERMISSIONS, ROLES, ROLE_LABEL, roleCan, type Permission } from "@/lib/auth/permissions";
import { useI18n } from "@/lib/i18n";

const LABEL: Record<Permission, string> = {
  "dashboard.view": "View dashboard",
  "students.view": "View students", "students.edit": "Add / edit students", "students.archive": "Archive students", "students.delete": "Delete students permanently",
  "admissions.manage": "Manage admissions",
  "classes.view": "View classes", "classes.manage": "Manage classes", "teachers.manage": "Manage teachers",
  "attendance.view": "View attendance", "attendance.mark": "Mark attendance",
  "hifz.view": "View Hifz progress", "hifz.record": "Record Hifz progress",
  "academics.view": "View exam results", "academics.record": "Enter exam results",
  "fees.view": "View fees", "fees.manage": "Collect fees & manage charges",
  "donations.manage": "Manage donations",
  "leave.view": "View leave", "leave.manage": "Approve / reject leave",
  "communication.send": "Send SMS & announcements",
  "reports.view": "View general reports", "reports.financial": "View financial reports",
  "users.manage": "Manage users", "settings.manage": "Change madrasa settings", "data.manage": "Backup, export & restore data",
};

/** Read-only table: which role can do what. */
export function RolesMatrix() {
  const { t } = useI18n();
  return (
    <Card className="overflow-hidden">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2.5 text-start font-semibold">{t("Permission")}</th>
              {ROLES.map((r) => <th key={r} className="whitespace-nowrap px-3 py-2.5 text-center font-semibold">{t(ROLE_LABEL[r])}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {ALL_PERMISSIONS.map((p) => (
              <tr key={p} className="hover:bg-stone-50/70">
                <td className="px-3 py-2 text-stone-700">{t(LABEL[p])}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    {roleCan(r, p) ? <Check className="mx-auto size-4 text-brand-600" aria-label={t("Yes")} /> : <Minus className="mx-auto size-4 text-stone-300" aria-label={t("No")} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500">{t("Teachers only see the classes assigned to them. Financial pages are hidden from teachers.")}</p>
    </Card>
  );
}

export const PERMISSION_LABELS = LABEL;
