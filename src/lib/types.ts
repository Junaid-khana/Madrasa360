/**
 * Domain types. These map 1:1 to the tables in docs/schema.sql so a real
 * PostgreSQL / Supabase backend can replace the local store without touching UI code.
 * All dates are ISO strings: "YYYY-MM-DD" for dates, full ISO for timestamps.
 */

export type Gender = "Male" | "Female";
export type ClassGender = Gender | "Mixed";
export type StudentStatus = "Active" | "Archived" | "Left" | "Graduated";
export type Residence = "Day Scholar" | "Hostel";
export type ProgressStatus = "Not Started" | "In Progress" | "Completed";

export type Role = "super_admin" | "admin" | "teacher" | "accountant";

export interface Guardian {
  name: string;
  relationship: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
}

export interface HifzProfile {
  status: ProgressStatus;
  startDate: string;
  currentPara: number; // 1-30
  currentSurah: string;
  parasCompleted: number; // 0-30 fully memorised paras
  dailyLesson: string; // Sabaq
  previousLesson: string; // Sabqi
  revision: string; // Manzil
  remarks: string;
}

export interface Student {
  id: string; // e.g. MDR-0001
  fullName: string;
  fatherName: string;
  dob: string;
  gender: Gender;
  bForm: string;
  photo: string; // data URL or ""
  address: string;
  city: string;
  province: string;
  guardian: Guardian;
  admissionDate: string;
  previousSchool: string;
  classId: string;
  section: string;
  status: StudentStatus;
  residence: Residence;
  monthlyFee: number;
  discount: number; // monthly PKR scholarship / discount
  nazraStatus: ProgressStatus;
  hifz: HifzProfile;
  createdAt: string;
  archivedAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  gender: Gender;
  phone: string;
  email: string;
  qualification: string;
  specialization: string;
  joinDate: string;
  status: "Active" | "Inactive";
}

export interface TimetableSlot {
  day: string; // Saturday..Thursday
  time: string; // "08:00 - 09:00"
  subject: string;
}

export type ClassKind = "qaida" | "nazra" | "hifz" | "nizami" | "general";

export interface ClassRoom {
  id: string;
  name: string; // "Hifz 1"
  section: string; // "A"
  kind: ClassKind;
  teacherId: string;
  room: string;
  gender: ClassGender;
  subjects: string[];
  timetable: TimetableSlot[];
}

export type AttendanceMark = "P" | "A" | "L";
export type Session = "Morning" | "Afternoon" | "Evening";

export interface AttendanceSheet {
  id: string;
  date: string;
  classId: string;
  session: Session;
  entries: Record<string, AttendanceMark>; // studentId -> mark
  markedBy: string; // userId
  updatedAt: string;
}

export type FeeCategory = "Monthly Fee" | "Admission Fee" | "Exam Fee" | "Other";
export type FeeStatus = "Paid" | "Partially Paid" | "Unpaid" | "Waived";
export type PaymentMethod = "Cash" | "JazzCash" | "Easypaisa" | "Bank Transfer" | "Cheque";

/** One charge for one student. Payments are allocated against it via Payment.allocations. */
export interface FeeRecord {
  id: string;
  studentId: string;
  month: string; // "YYYY-MM"
  category: FeeCategory;
  description: string;
  amount: number;
  discount: number;
  waived: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNo: string;
  studentId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  allocations: { feeId: string; amount: number }[];
  receivedBy: string; // userId
  note: string;
}

export type DonationCategory =
  | "General Donation"
  | "Zakat"
  | "Sadaqah"
  | "Student Sponsorship"
  | "Building Fund"
  | "Food"
  | "Books"
  | "Other";

export interface Donation {
  id: string;
  receiptNo: string;
  donorName: string;
  phone: string;
  amount: number;
  date: string;
  category: DonationCategory;
  method: PaymentMethod;
  purpose: string;
  notes: string;
  receivedBy: string;
}

export type HifzQuality = "Excellent" | "Good" | "Average" | "Weak";

export interface HifzRecord {
  id: string;
  studentId: string;
  date: string;
  para: number;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  sabaq: string; // new lesson
  sabqi: string; // previous lesson
  manzil: string; // revision
  mistakes: number;
  quality: HifzQuality;
  assessment: string; // teacher's note
  teacherId: string;
  paraCompleted: boolean;
}

export interface ExamResult {
  id: string;
  studentId: string;
  classId: string;
  exam: string; // "Mid-Term 2026"
  subject: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  remarks: string;
  enteredBy: string;
  date: string;
}

export type LeaveType = "Sick" | "Family Event" | "Travel" | "Other";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRecord {
  id: string;
  studentId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvedBy: string; // user name or ""
  remarks: string;
  createdAt: string;
}

export type MessageType = "SMS" | "Announcement" | "Fee Reminder" | "Attendance Alert" | "General Notice";

export interface MessageRecipient {
  studentId: string;
  name: string; // guardian name
  phone: string;
  body: string;
}

export interface CommunicationMessage {
  id: string;
  type: MessageType;
  audience: string; // human readable
  body: string; // template body
  recipients: MessageRecipient[];
  status: "Sent" | "Queued" | "Failed";
  provider: string;
  sentBy: string; // user name
  sentAt: string;
}

export type AdmissionStatus = "New" | "Under Review" | "Accepted" | "Rejected" | "Admitted";

export interface AdmissionApplication {
  id: string;
  applicantName: string;
  fatherName: string;
  dob: string;
  gender: Gender;
  guardianPhone: string;
  address: string;
  appliedClassId: string;
  appliedDate: string;
  previousSchool: string;
  status: AdmissionStatus;
  notes: string;
  studentId?: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  name: string;
  type: string; // "B-Form", "Birth Certificate", "Previous Result", ...
  uploadedAt: string;
  sizeKb: number;
}

export type ActivityKind =
  | "student"
  | "fee"
  | "attendance"
  | "hifz"
  | "donation"
  | "exam"
  | "leave"
  | "communication"
  | "admission"
  | "class"
  | "user"
  | "settings"
  | "auth"
  | "data";

export interface ActivityEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  kind: ActivityKind;
  text: string;
  refId?: string; // studentId etc, for linking
}

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: "Active" | "Disabled";
  lastLogin: string | null;
  passwordHash: string;
  mustChangePassword?: boolean;
  teacherId?: string;
}

export interface FeeDiscountPreset {
  id: string;
  name: string;
  amount: number;
}

export interface Settings {
  madrasaName: string;
  madrasaNameUr: string;
  logo: string; // data URL or ""
  address: string;
  phone: string;
  email: string;
  website: string;
  principal: string;
  academicYear: string; // "2026"
  subjects: string[];
  examTypes: string[];
  defaultMonthlyFee: number;
  admissionFee: number;
  examFee: number;
  feeCategories: FeeCategory[];
  discountPresets: FeeDiscountPreset[];
  sms: { provider: string; senderId: string; apiKey: string };
  notifications: {
    feeReminders: boolean;
    absenceAlerts: boolean;
    leaveRequests: boolean;
    backupReminder: boolean;
  };
}

export interface BackupInfo {
  lastBackupAt: string | null;
  lastExportAt: string | null;
  auto: boolean;
}

export interface Counters {
  student: number;
  receipt: number;
  donation: number;
  application: number;
}

export interface Db {
  version: number;
  settings: Settings;
  backup: BackupInfo;
  counters: Counters;
  users: AppUser[];
  teachers: Teacher[];
  classes: ClassRoom[];
  students: Student[];
  attendance: AttendanceSheet[];
  fees: FeeRecord[];
  payments: Payment[];
  donations: Donation[];
  hifz: HifzRecord[];
  results: ExamResult[];
  leaves: LeaveRecord[];
  messages: CommunicationMessage[];
  applications: AdmissionApplication[];
  documents: StudentDocument[];
  activity: ActivityEntry[];
}
