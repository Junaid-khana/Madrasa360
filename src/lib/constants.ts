import type {
  AdmissionStatus, AttendanceMark, DonationCategory, FeeCategory, HifzQuality, LeaveType,
  MessageType, PaymentMethod, ProgressStatus, Residence, Session, StudentStatus,
} from "./types";

export const DB_VERSION = 1;
export const STORAGE_KEY = "madrasa.db.v1";
export const SESSION_KEY = "madrasa.session";
export const LANG_COOKIE = "madrasa.lang";

export const PROVINCES = [
  "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory",
  "Azad Jammu & Kashmir", "Gilgit-Baltistan",
];
export const RELATIONSHIPS = ["Father", "Mother", "Brother", "Uncle", "Grandfather", "Guardian"];
export const STUDENT_STATUSES: StudentStatus[] = ["Active", "Archived", "Left", "Graduated"];
export const RESIDENCES: Residence[] = ["Day Scholar", "Hostel"];
export const PROGRESS_STATUSES: ProgressStatus[] = ["Not Started", "In Progress", "Completed"];
export const SESSIONS: Session[] = ["Morning", "Afternoon", "Evening"];
export const ATTENDANCE_MARKS: AttendanceMark[] = ["P", "A", "L"];
export const FEE_CATEGORIES: FeeCategory[] = ["Monthly Fee", "Admission Fee", "Exam Fee", "Other"];
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "JazzCash", "Easypaisa", "Bank Transfer", "Cheque"];
export const DONATION_CATEGORIES: DonationCategory[] = [
  "General Donation", "Zakat", "Sadaqah", "Student Sponsorship", "Building Fund", "Food", "Books", "Other",
];
export const HIFZ_QUALITIES: HifzQuality[] = ["Excellent", "Good", "Average", "Weak"];
export const LEAVE_TYPES: LeaveType[] = ["Sick", "Family Event", "Travel", "Other"];
export const MESSAGE_TYPES: MessageType[] = ["SMS", "Announcement", "Fee Reminder", "Attendance Alert", "General Notice"];
export const ADMISSION_STATUSES: AdmissionStatus[] = ["New", "Under Review", "Accepted", "Rejected", "Admitted"];
export const WEEK_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
export const DOCUMENT_TYPES = ["B-Form", "Birth Certificate", "Guardian CNIC", "Previous Result", "Photograph", "Other"];

/** Main surah at the start of each para (juz). Used for pickers and Hifz progress. */
export const PARA_SURAH: string[] = [
  "Al-Fatihah", "Al-Baqarah", "Al-Baqarah", "Aal-e-Imran", "An-Nisa", "An-Nisa", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Hud", "Yusuf", "Al-Hijr", "Al-Isra",
  "Al-Kahf", "Al-Anbiya", "Al-Mu'minun", "Al-Furqan", "An-Naml", "Al-Ankabut", "Al-Ahzab",
  "Ya-Sin", "Az-Zumar", "Fussilat", "Al-Ahqaf", "Adh-Dhariyat", "Al-Mujadila", "Al-Mulk", "An-Naba",
];

export const SURAHS: string[] = [
  "Al-Fatihah", "Al-Baqarah", "Aal-e-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal",
  "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf",
  "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml",
  "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin",
  "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar",
  "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah",
  "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba",
  "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq",
  "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
  "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr",
  "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad",
  "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

export const PROVIDERS = [
  { id: "none", label: "Not connected (simulation mode)" },
  { id: "custom-http", label: "Custom HTTP gateway (coming soon)" },
];

export const GRADE_SCALE: { min: number; grade: string }[] = [
  { min: 90, grade: "A+" }, { min: 80, grade: "A" }, { min: 70, grade: "B" },
  { min: 60, grade: "C" }, { min: 50, grade: "D" }, { min: 40, grade: "E" }, { min: 0, grade: "F" },
];
export const PASS_PERCENT = 40;
