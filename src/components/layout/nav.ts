import {
  BarChart3, CalendarOff, ClipboardCheck, FileText, GraduationCap, HeartHandshake, LayoutDashboard, MessageSquare,
  School, Settings, UserCog, UserPlus, BookOpen, Wallet, type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export interface NavItem { href: string; label: string; icon: LucideIcon; perm: Permission[] }

/** Sidebar order follows the brief. A user sees an item if they hold ANY of its permissions. */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: ["dashboard.view"] },
  { href: "/students", label: "Students", icon: GraduationCap, perm: ["students.view"] },
  { href: "/admissions", label: "Admissions", icon: UserPlus, perm: ["admissions.manage"] },
  { href: "/classes", label: "Classes", icon: School, perm: ["classes.view"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, perm: ["attendance.view"] },
  { href: "/hifz", label: "Hifz Progress", icon: BookOpen, perm: ["hifz.view"] },
  { href: "/fees", label: "Fees", icon: Wallet, perm: ["fees.view"] },
  { href: "/donations", label: "Donations", icon: HeartHandshake, perm: ["donations.manage"] },
  { href: "/exams", label: "Exams & Results", icon: FileText, perm: ["academics.view"] },
  { href: "/leave", label: "Leave", icon: CalendarOff, perm: ["leave.view"] },
  { href: "/communication", label: "Communication", icon: MessageSquare, perm: ["communication.send"] },
  { href: "/reports", label: "Reports", icon: BarChart3, perm: ["reports.view", "reports.financial"] },
  { href: "/users", label: "Users", icon: UserCog, perm: ["users.manage"] },
  { href: "/settings", label: "Settings", icon: Settings, perm: ["settings.manage", "data.manage"] },
];

/** Items shown in the phone bottom bar (first four the user may open) — the rest live under "More". */
export const BOTTOM_HREFS = ["/dashboard", "/attendance", "/hifz", "/fees", "/students"];

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");
