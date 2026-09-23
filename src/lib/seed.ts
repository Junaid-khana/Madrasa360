/**
 * Deterministic demo-data generator. All names, phone numbers and addresses are fictional.
 * Dates are generated relative to "today" so the demo always looks current.
 */
import { DB_VERSION, PARA_SURAH, WEEK_DAYS } from "./constants";
import type {
  ActivityEntry, AdmissionApplication, AppUser, AttendanceMark, AttendanceSheet, ClassKind, ClassRoom,
  CommunicationMessage, Db, Donation, ExamResult, FeeRecord, Gender, HifzQuality, HifzRecord, LeaveRecord,
  Payment, PaymentMethod, Settings, Student, StudentDocument, Teacher,
} from "./types";
import { addDays, addMonths, calcAge, gradeFor, monthOf, parseISO, toISODate } from "./utils";

export const DEMO_PASSWORD = "madrasa123";
export const DEMO_PASSWORD_HASH = "6be5afaceaf08fdb6355ddd4975bf585578d6b719e92a77edbea7d3b50b0453c";

/* ---------- tiny seeded PRNG ---------- */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_FIRST = [
  "Muhammad Hamza", "Abdullah", "Muhammad Ali", "Usman", "Bilal", "Hassan", "Hussain", "Ahmed", "Zain", "Talha",
  "Muhammad Owais", "Abdul Rehman", "Ibrahim", "Ismail", "Yahya", "Zakariya", "Muhammad Saad", "Huzaifa", "Anas",
  "Salman", "Faizan", "Danish", "Rayyan", "Mustafa", "Umar", "Hamza", "Ayaan", "Shayan", "Waleed", "Junaid",
  "Ammar", "Zubair", "Kashif", "Adeel", "Haris", "Rehan", "Talal", "Arham", "Moiz", "Sufyan", "Abu Bakr", "Uzair",
];
const FEMALE_FIRST = [
  "Ayesha", "Fatima", "Khadija", "Maryam", "Zainab", "Hafsa", "Amna", "Sana", "Aliza", "Iqra", "Noor Fatima",
  "Rabia", "Sumaiya", "Areeba", "Laiba", "Hira", "Mahnoor", "Aiman", "Eman", "Zunaira", "Bushra", "Saira",
  "Asma", "Rukhsar", "Kinza", "Warda", "Inaya", "Minahil", "Sidra", "Nimra",
];
const FATHER_FIRST = [
  "Abdul Rauf", "Muhammad Aslam", "Ghulam Mustafa", "Muhammad Rafiq", "Abdul Majeed", "Tariq Mehmood", "Muhammad Ashraf",
  "Nadeem Akhtar", "Shahid Hussain", "Imran Ali", "Khalid Mehmood", "Muhammad Sharif", "Zahid Iqbal", "Waseem Abbas",
  "Rashid Ahmed", "Abdul Ghaffar", "Muhammad Younas", "Naveed Anjum", "Sajjad Hussain", "Irfan Ullah", "Farooq Ahmed",
  "Muhammad Idrees", "Liaqat Ali", "Javed Iqbal", "Munir Ahmad", "Shafiq ur Rehman", "Mazhar Iqbal", "Atif Raza",
];
const FAMILY = [
  "Khan", "Butt", "Malik", "Chaudhry", "Qureshi", "Siddiqui", "Ansari", "Sheikh", "Raza", "Awan", "Mughal", "Rana",
  "Bhatti", "Abbasi", "Javed", "Niazi", "Hashmi", "Mirza", "Gondal", "Cheema", "Rajput", "Dar", "Lodhi", "Baig",
];
const AREAS = [
  "Islam Pura", "Model Town", "Garhi Shahu", "Shadbagh", "Bhati Gate", "Samanabad", "Iqbal Town", "Township",
  "Mughalpura", "Baghbanpura", "Ichhra", "Wahdat Colony", "Mozang", "Shalimar Town", "Gulshan-e-Ravi",
];
const MOBILE_PREFIX = [
  "0300", "0301", "0302", "0303", "0304", "0306", "0311", "0312", "0313", "0321", "0322", "0323", "0331", "0332",
  "0333", "0335", "0340", "0341", "0344", "0345", "0346",
];
const REMARKS = [
  "Mashallah, lesson was smooth and confident.", "Needs more revision of the previous lesson.",
  "Makharij need attention while reciting.", "Excellent memory, keep it up.",
  "Confuses similar verses (mutashabihat) — revise daily.", "Good progress this week.",
  "Was distracted today; lesson taken twice.", "Tajweed rules applied correctly.",
  "Sabqi was weak, asked to repeat at home.", "Very regular and punctual.",
];

const SUBJECTS: Record<ClassKind, string[]> = {
  qaida: ["Noorani Qaida", "Dua & Masnoon Duain", "Urdu Basics"],
  nazra: ["Nazra Quran", "Tajweed", "Dua & Masnoon Duain", "Urdu"],
  hifz: ["Hifz (Sabaq)", "Tajweed", "Deeniyat"],
  nizami: ["Sarf", "Nahw", "Fiqh", "Arabic Basics", "Urdu", "Seerat"],
  general: ["English", "Mathematics", "Urdu", "Science", "Islamiyat", "Computer Basics"],
};
const FEE_BY_KIND: Record<ClassKind, number> = { qaida: 1000, nazra: 1200, hifz: 1500, nizami: 1800, general: 1500 };
const TIMES = ["08:00 - 09:30", "09:45 - 11:15", "11:30 - 12:30"];

const pad4 = (n: number) => String(n).padStart(4, "0");

export function buildSeed(now: Date = new Date()): Db {
  const rng = mulberry32(20260918);
  const int = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  const chance = (p: number) => rng() < p;
  const phone = () => `${pick(MOBILE_PREFIX)}-${int(1000000, 9999999)}`;
  let seq = 0;
  const nid = (p: string) => `${p}_${(++seq).toString(36)}`;

  const today = toISODate(now);
  const thisMonth = monthOf(today);
  const isFriday = (iso: string) => parseISO(iso).getDay() === 5;

  /* ---------- settings ---------- */
  const allSubjects = Array.from(new Set(Object.values(SUBJECTS).flat()));
  const settings: Settings = {
    madrasaName: "Madrasa Noor-ul-Quran",
    madrasaNameUr: "مدرسہ نور القرآن",
    logo: "",
    address: "Street 12, Islam Pura, Lahore, Punjab",
    phone: "042-37654321",
    email: "info@noorulquran.example",
    website: "www.noorulquran.example",
    principal: "Hafiz Tahir Mehmood",
    academicYear: String(now.getFullYear()),
    subjects: allSubjects,
    examTypes: ["Monthly Test", "Mid-Term", "Final"],
    defaultMonthlyFee: 1500,
    admissionFee: 1000,
    examFee: 500,
    feeCategories: ["Monthly Fee", "Admission Fee", "Exam Fee", "Other"],
    discountPresets: [
      { id: "dp1", name: "Sibling concession", amount: 200 },
      { id: "dp2", name: "Hafiz family concession", amount: 300 },
      { id: "dp3", name: "Needy family support", amount: 500 },
    ],
    sms: { provider: "none", senderId: "NOORQURAN", apiKey: "" },
    notifications: { feeReminders: true, absenceAlerts: true, leaveRequests: true, backupReminder: true },
  };

  /* ---------- teachers ---------- */
  const T = (name: string, gender: Gender, qualification: string, specialization: string, joinYears: number): Teacher => ({
    id: nid("t"), name, gender, phone: phone(), email: "", qualification, specialization,
    joinDate: addDays(today, -Math.round(joinYears * 365) - int(0, 200)), status: "Active",
  });
  const teachers: Teacher[] = [
    T("Qari Abdul Rehman Siddiqui", "Male", "Hafiz, Qari (Tajweed)", "Hifz", 8),
    T("Qari Muhammad Yousaf Awan", "Male", "Hafiz, Qari (Sab'ah)", "Hifz", 6),
    T("Hafiz Muhammad Bilal Ahmed", "Male", "Hafiz, Alim", "Hifz", 4),
    T("Maulana Shabbir Ahmad Qadri", "Male", "Dars-e-Nizami (Fazil)", "Dars-e-Nizami", 10),
    T("Ustaniyah Hafiza Aisha Siddiqa", "Female", "Hafiza, Alimah", "Hifz", 5),
    T("Ustaniyah Khadija Noor", "Female", "Hafiza, Qariah", "Hifz", 3),
    T("Ustaniyah Maryam Bibi", "Female", "Alimah", "Nazra & Qaida", 7),
    T("Qari Hamza Farooq", "Male", "Qari (Tajweed)", "Nazra & Qaida", 2),
    T("Ustaniyah Fatima Zahra", "Female", "Alimah (Dars-e-Nizami)", "Dars-e-Nizami", 4),
    T("Sir Usman Ghani", "Male", "M.A. Education", "General Studies", 3),
  ];
  teachers.forEach((t, i) => (t.email = `teacher${i + 1}@noorulquran.example`));

  /* ---------- classes ---------- */
  const C = (
    name: string, section: string, kind: ClassKind, teacher: Teacher, room: string,
    gender: ClassRoom["gender"],
  ): ClassRoom => {
    const subjects = SUBJECTS[kind];
    return {
      id: nid("c"), name, section, kind, teacherId: teacher.id, room, gender, subjects,
      timetable: WEEK_DAYS.flatMap((day, i) =>
        TIMES.map((time, j) => ({ day, time, subject: subjects[(i + j) % subjects.length] }))),
    };
  };
  const [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10] = teachers;
  const classes: ClassRoom[] = [
    C("Qaida", "A", "qaida", t8, "Room 1", "Mixed"),
    C("Qaida", "B", "qaida", t7, "Room 2", "Female"),
    C("Nazra", "A", "nazra", t8, "Room 3", "Male"),
    C("Nazra", "B", "nazra", t7, "Room 4", "Female"),
    C("Hifz 1", "A", "hifz", t1, "Hifz Hall 1", "Male"),
    C("Hifz 1", "B", "hifz", t5, "Girls Hall 1", "Female"),
    C("Hifz 2", "A", "hifz", t2, "Hifz Hall 2", "Male"),
    C("Hifz 2", "B", "hifz", t6, "Girls Hall 2", "Female"),
    C("Hifz 3", "A", "hifz", t3, "Hifz Hall 3", "Male"),
    C("Dars-e-Nizami Basic", "A", "nizami", t4, "Room 5", "Male"),
    C("Dars-e-Nizami Basic", "B", "nizami", t9, "Room 6", "Female"),
    C("General Studies", "A", "general", t10, "Room 7", "Mixed"),
  ];
  const [cQa, cQb, cNa, cNb, cH1a, cH1b, cH2a, cH2b, cH3a, cDa, cDb, cGs] = classes;

  /* ---------- students ---------- */
  // [class, males, females, minAge, maxAge]
  const plan: [ClassRoom, number, number, number, number][] = [
    [cQa, 6, 5, 5, 7], [cQb, 0, 7, 5, 7], [cNa, 10, 0, 6, 9], [cNb, 0, 7, 6, 9],
    [cH1a, 9, 0, 8, 11], [cH1b, 0, 7, 8, 11], [cH2a, 8, 0, 9, 13], [cH2b, 0, 6, 9, 13],
    [cH3a, 7, 0, 11, 15], [cDa, 8, 0, 11, 15], [cDb, 0, 5, 11, 15], [cGs, 6, 4, 9, 14],
  ];
  const paraRange: Record<string, [number, number]> = {
    [cH1a.id]: [0, 5], [cH1b.id]: [0, 5], [cH2a.id]: [5, 12], [cH2b.id]: [5, 11], [cH3a.id]: [12, 24],
  };
  const waivedIds = new Set<number>([4, 33, 61]); // indices of orphan students whose fees are waived
  const drafts: Student[] = [];
  let idx = 0;

  const makeStudent = (cls: ClassRoom, gender: Gender, minAge: number, maxAge: number): Student => {
    const family = pick(FAMILY);
    const first = pick(gender === "Male" ? MALE_FIRST : FEMALE_FIRST);
    const fatherName = `${pick(FATHER_FIRST)} ${family}`;
    const age = int(minAge, maxAge);
    const dob = addDays(today, -(age * 365 + int(5, 350)));
    const area = pick(AREAS);
    const city = chance(0.9) ? "Lahore" : pick(["Gujranwala", "Sheikhupura", "Kasur", "Faisalabad"]);
    const province = "Punjab";
    const address = `House ${int(1, 240)}, Street ${int(1, 30)}, ${area}`;
    const guardianIsFather = chance(0.9);
    const rel = guardianIsFather ? "Father" : pick(["Uncle", "Grandfather", "Brother", "Mother"]);
    const hostel = gender === "Male" && age >= 10 && cls.kind !== "qaida" && chance(0.3);
    const base = FEE_BY_KIND[cls.kind] + (hostel ? 3000 : 0);
    const waived = waivedIds.has(idx);
    const discount = waived ? base : chance(0.13) ? pick([200, 300, 500]) : 0;
    const admissionDate = addDays(today, -int(20, 1000));
    const [pMin, pMax] = paraRange[cls.id] ?? [0, 0];
    const isHifz = cls.kind === "hifz";
    const completedHifz = cls.id === cDa.id && chance(0.35);
    const parasCompleted = completedHifz ? 30 : isHifz ? int(pMin, pMax) : 0;
    const currentPara = completedHifz ? 30 : Math.min(parasCompleted + 1, 30);
    const surah = PARA_SURAH[currentPara - 1];
    const nazraStatus =
      cls.kind === "qaida" ? "Not Started" : cls.kind === "nazra" ? "In Progress" : cls.kind === "general" ? (chance(0.5) ? "Completed" : "In Progress") : "Completed";
    const hifzStatus = completedHifz ? "Completed" : isHifz ? "In Progress" : "Not Started";
    idx++;
    return {
      id: "", fullName: `${first} ${family}`, fatherName, dob, gender,
      bForm: chance(0.6) ? `35202-${int(1000000, 9999999)}-${int(1, 9)}` : "",
      photo: "", address, city, province,
      guardian: {
        name: guardianIsFather ? fatherName : `${pick(FATHER_FIRST)} ${family}`,
        relationship: rel, phone: phone(), altPhone: chance(0.4) ? phone() : "",
        email: chance(0.2) ? `${family.toLowerCase()}${int(10, 99)}@example.com` : "", address,
      },
      admissionDate, previousSchool: chance(0.35) ? pick(["Govt. Primary School", "Al-Huda Public School", "Iqra Rauzat-ul-Atfal", "Home schooled", "Jamia Ashrafia Branch"]) : "",
      classId: cls.id, section: cls.section, status: "Active", residence: hostel ? "Hostel" : "Day Scholar",
      monthlyFee: base, discount, nazraStatus,
      hifz: {
        status: hifzStatus, startDate: hifzStatus === "Not Started" ? "" : addDays(today, -int(60, 900)),
        currentPara, currentSurah: hifzStatus === "Not Started" ? "" : surah, parasCompleted,
        dailyLesson: "", previousLesson: "", revision: "", remarks: "",
      },
      createdAt: admissionDate + "T09:00:00.000Z",
    };
  };
  for (const [cls, m, f, a, b] of plan) {
    for (let i = 0; i < m; i++) drafts.push(makeStudent(cls, "Male", a, b));
    for (let i = 0; i < f; i++) drafts.push(makeStudent(cls, "Female", a, b));
  }
  // a few recent admissions so the dashboard shows growth
  [0, 3, 8, 12, 20, 26, 41, 55, 70].forEach((i, k) => { drafts[i].admissionDate = addDays(today, -(3 + k * 9)); drafts[i].createdAt = drafts[i].admissionDate + "T10:00:00.000Z"; });
  // archived / left / graduated
  const extra = [
    { ...makeStudent(cDa, "Male", 14, 15), status: "Graduated" as const },
    { ...makeStudent(cGs, "Female", 12, 14), status: "Left" as const },
    { ...makeStudent(cNa, "Male", 7, 9), status: "Archived" as const, archivedAt: addDays(today, -40) + "T00:00:00.000Z" },
  ];
  drafts.push(...extra);
  drafts.sort((a, b) => a.admissionDate.localeCompare(b.admissionDate));
  const students = drafts.map((s, i) => ({ ...s, id: `MDR-${pad4(i + 1)}` }));
  const active = students.filter((s) => s.status === "Active");
  const bornWaived = new Set(students.filter((s) => s.discount >= s.monthlyFee && s.discount > 0).map((s) => s.id));

  /* ---------- users ---------- */
  const U = (name: string, username: string, role: AppUser["role"], teacherId?: string, status: AppUser["status"] = "Active"): AppUser => ({
    id: nid("u"), name, username, email: `${username}@noorulquran.example`, role, status,
    lastLogin: new Date(now.getTime() - int(1, 900) * 3600_000).toISOString(), passwordHash: DEMO_PASSWORD_HASH, teacherId,
  });
  const users: AppUser[] = [
    U("Hafiz Tahir Mehmood", "superadmin", "super_admin"),
    U("Sajid Iqbal", "manager", "admin"),
    U("Muhammad Nadeem", "accountant", "accountant"),
    ...teachers.map((t, i) => U(t.name, i === 0 ? "teacher" : `teacher${i + 1}`, "teacher", t.id)),
    U("Rizwan Ahmed (former accountant)", "rizwan", "accountant", undefined, "Disabled"),
  ];
  const superAdmin = users[0], manager = users[1], accountant = users[2];
  const userOfTeacher = (tid: string) => users.find((u) => u.teacherId === tid)!;

  /* ---------- leaves ---------- */
  const leaves: LeaveRecord[] = [];
  const reasons: [LeaveRecord["type"], string][] = [
    ["Sick", "Fever and cold, doctor advised rest."], ["Family Event", "Cousin's wedding in Gujranwala."],
    ["Travel", "Visiting grandparents in the village."], ["Sick", "Stomach infection."],
    ["Other", "Family bereavement."], ["Family Event", "Family gathering."],
  ];
  for (let i = 0; i < 14; i++) {
    const s = active[int(0, active.length - 1)];
    const [type, reason] = pick(reasons);
    const offset = i === 0 ? -1 : i === 1 ? 0 : int(-25, 6);
    const start = addDays(today, offset);
    const end = addDays(start, i < 2 ? 2 : int(0, 3));
    const status: LeaveRecord["status"] = offset > 1 ? "Pending" : i % 5 === 3 ? "Rejected" : i < 2 || i % 4 === 1 ? "Approved" : offset >= 0 ? "Pending" : "Approved";
    leaves.push({
      id: nid("lv"), studentId: s.id, type, startDate: start, endDate: end, reason, status,
      approvedBy: status === "Pending" ? "" : manager.name,
      remarks: status === "Rejected" ? "Exam week — leave not possible." : status === "Approved" ? "Approved." : "",
      createdAt: addDays(start, -1) + "T08:30:00.000Z",
    });
  }
  const leaveCovers = (sid: string, date: string) =>
    leaves.some((l) => l.status === "Approved" && l.studentId === sid && l.startDate <= date && l.endDate >= date);

  /* ---------- attendance ---------- */
  const attendance: AttendanceSheet[] = [];
  const absentee = new Set(active.filter(() => chance(0.07)).map((s) => s.id));
  for (let back = 40; back >= 0; back--) {
    const date = addDays(today, -back);
    if (isFriday(date) && date !== today) continue;
    classes.forEach((cls, ci) => {
      if (date === today && ci >= 9) return; // last 3 classes not yet marked today
      const roster = active.filter((s) => s.classId === cls.id && s.admissionDate <= date);
      if (!roster.length) return;
      const entries: Record<string, AttendanceMark> = {};
      for (const s of roster) {
        const r = rng();
        const pAbs = absentee.has(s.id) ? 0.28 : 0.045;
        entries[s.id] = leaveCovers(s.id, date) ? "L" : r < pAbs ? "A" : r < pAbs + 0.02 ? "L" : "P";
      }
      attendance.push({
        id: nid("at"), date, classId: cls.id, session: "Morning", entries,
        markedBy: userOfTeacher(cls.teacherId).id, updatedAt: `${date}T08:${String(int(10, 40)).padStart(2, "0")}:00.000Z`,
      });
    });
  }

  /* ---------- fees & payments ---------- */
  const fees: FeeRecord[] = [];
  const payments: Payment[] = [];
  const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth, i - 5));
  const chronic = new Set(active.filter(() => chance(0.07)).map((s) => s.id));
  const methods: PaymentMethod[] = ["Cash", "Cash", "Cash", "JazzCash", "Easypaisa", "Bank Transfer"];
  const pendingPay: Payment[] = [];
  const dayCap = (m: string) => (m === thisMonth ? Math.max(1, parseISO(today).getDate()) : 26);

  const addCharge = (s: Student, month: string, category: FeeRecord["category"], description: string, amount: number, discount: number, waived: boolean, payProb: number) => {
    const rec: FeeRecord = { id: nid("f"), studentId: s.id, month, category, description, amount, discount, waived, createdAt: `${month}-01T09:00:00.000Z` };
    fees.push(rec);
    if (waived) return;
    const net = amount - discount;
    if (net <= 0 || chronic.has(s.id) && month >= addMonths(thisMonth, -2)) return;
    const r = rng();
    if (r > payProb) return; // unpaid
    const partial = r > payProb - 0.06;
    const paid = partial ? Math.round((net * (0.4 + rng() * 0.3)) / 100) * 100 : net;
    const day = int(Math.min(3, dayCap(month)), dayCap(month));
    pendingPay.push({
      id: nid("p"), receiptNo: "", studentId: s.id, date: `${month}-${String(day).padStart(2, "0")}`, amount: paid,
      method: pick(methods), allocations: [{ feeId: rec.id, amount: paid }],
      receivedBy: accountant.id, note: partial ? "Balance to be paid next week" : "",
    });
  };
  for (const s of active) {
    for (const m of months) {
      const startMonth = monthOf(s.admissionDate);
      if (m < startMonth) continue;
      const waived = bornWaived.has(s.id);
      addCharge(s, m, "Monthly Fee", `Monthly fee ${m}`, s.monthlyFee, waived ? s.monthlyFee : s.discount, waived, m === thisMonth ? 0.68 : 0.96);
      if (m === startMonth && !waived) addCharge(s, m, "Admission Fee", "Admission fee", settings.admissionFee, 0, false, 0.9);
    }
    const examMonth = addMonths(thisMonth, -1);
    if (monthOf(s.admissionDate) <= examMonth && !bornWaived.has(s.id)) addCharge(s, examMonth, "Exam Fee", "Mid-Term exam fee", settings.examFee, 0, false, 0.85);
  }
  // make sure some payments were received today
  const todayCands = pendingPay.filter((p) => p.date.startsWith(thisMonth)).slice(-14);
  todayCands.slice(0, 7).forEach((p) => (p.date = today));
  pendingPay.sort((a, b) => a.date.localeCompare(b.date));
  pendingPay.forEach((p, i) => { p.receiptNo = `RCP-${p.date.slice(0, 4)}-${pad4(i + 1)}`; payments.push(p); });

  /* ---------- donations ---------- */
  const donors: [string, string][] = [
    ["Haji Muhammad Rafiq", "Zakat"], ["Mian Tariq Mehmood", "Building Fund"], ["Al-Noor Traders", "General Donation"],
    ["Ch. Aslam Pervaiz", "Student Sponsorship"], ["Mrs. Shaista Bibi", "Sadaqah"], ["Sheikh Nadeem Akhtar", "Food"],
    ["Malik Fayyaz Hussain", "Zakat"], ["Rana Abdul Waheed & Sons", "Building Fund"], ["Dr. Ayesha Imtiaz", "Books"],
    ["Anonymous Donor", "General Donation"], ["Haji Ghulam Qadir", "Zakat"], ["Bismillah Bakers", "Food"],
    ["Mr. Kamran Butt", "Student Sponsorship"], ["Hafiz Ijaz Ahmed", "Sadaqah"], ["Madina Cloth House", "General Donation"],
  ];
  const purposes: Record<string, string> = {
    "Zakat": "Zakat for needy students", "Building Fund": "Hostel room construction", "General Donation": "Monthly running expenses",
    "Student Sponsorship": "Sponsorship of one orphan student", "Sadaqah": "General Sadaqah", "Food": "Hostel kitchen ration",
    "Books": "Books and stationery for students", "Other": "",
  };
  const donations: Donation[] = [];
  for (let i = 0; i < 32; i++) {
    const [name, cat] = donors[i % donors.length];
    const date = i < 3 ? addDays(today, -i) : addDays(today, -int(1, 175));
    donations.push({
      id: nid("d"), receiptNo: "", donorName: name, phone: chance(0.8) ? phone() : "", amount: pick([1000, 2000, 5000, 5000, 10000, 15000, 25000, 50000, 100000]),
      date, category: cat as Donation["category"], method: pick(methods), purpose: purposes[cat] ?? "", notes: "", receivedBy: accountant.id,
    });
  }
  donations.sort((a, b) => a.date.localeCompare(b.date));
  donations.forEach((d, i) => (d.receiptNo = `DON-${d.date.slice(0, 4)}-${pad4(i + 1)}`));

  /* ---------- hifz records ---------- */
  const hifz: HifzRecord[] = [];
  const hifzStudents = active.filter((s) => s.hifz.status === "In Progress");
  const qualityBy = (talent: number): HifzQuality => { const r = rng() + talent; return r > 1.25 ? "Excellent" : r > 0.75 ? "Good" : r > 0.35 ? "Average" : "Weak"; };
  for (const s of hifzStudents) {
    const cls = classes.find((c) => c.id === s.classId)!;
    const talent = rng() * 0.5 - 0.1;
    const days: string[] = [];
    for (let back = 0; back < 24; back++) { const d = addDays(today, -back); if (back === 0 ? chance(0.6) : !isFriday(d) && chance(0.88)) days.push(d); }
    days.reverse();
    let ayah = int(1, 30);
    const recs: HifzRecord[] = [];
    days.forEach((date, k) => {
      const span = int(4, 9);
      const boundary = s.hifz.parasCompleted >= 1 && k === Math.floor(days.length * 0.4);
      const para = s.hifz.parasCompleted >= 1 && k <= Math.floor(days.length * 0.4) ? s.hifz.currentPara - 1 : s.hifz.currentPara;
      const surah = PARA_SURAH[Math.max(para, 1) - 1];
      if (boundary) ayah = 1;
      const prev = recs[recs.length - 1];
      recs.push({
        id: nid("h"), studentId: s.id, date, para, surah, ayahFrom: ayah, ayahTo: ayah + span,
        sabaq: `${surah} ${ayah}–${ayah + span}`, sabqi: prev ? prev.sabaq : `${surah} ${Math.max(1, ayah - span)}–${ayah - 1}`,
        manzil: `Para ${Math.max(1, para - (k % 3) - 1)}${para > 3 ? ` – ${Math.max(1, para - 1)}` : ""}`,
        mistakes: Math.max(0, Math.round(rng() * (talent > 0.2 ? 2 : 5))), quality: qualityBy(talent), assessment: pick(REMARKS),
        teacherId: cls.teacherId, paraCompleted: boundary,
      });
      ayah += span + 1;
    });
    hifz.push(...recs);
    const last = recs[recs.length - 1];
    if (last) {
      s.hifz.currentSurah = last.surah;
      s.hifz.dailyLesson = last.sabaq;
      s.hifz.previousLesson = last.sabqi;
      s.hifz.revision = last.manzil;
      s.hifz.remarks = last.assessment;
    }
  }

  /* ---------- exam results ---------- */
  const results: ExamResult[] = [];
  const midDate = `${addMonths(thisMonth, -1)}-20`;
  const enterResults = (exam: string, date: string, clsList: ClassRoom[]) => {
    for (const s of active) {
      const cls = clsList.find((c) => c.id === s.classId);
      if (!cls || s.admissionDate > date) continue;
      const ability = 52 + rng() * 40;
      for (const subject of cls.subjects) {
        const total = 100;
        const marks = Math.max(18, Math.min(total, Math.round(ability + (rng() - 0.5) * 24)));
        const percentage = Math.round((marks / total) * 1000) / 10;
        results.push({
          id: nid("r"), studentId: s.id, classId: cls.id, exam, subject, marks, totalMarks: total, percentage,
          grade: gradeFor(percentage), remarks: percentage >= 85 ? "Excellent" : percentage < 45 ? "Needs improvement" : "",
          enteredBy: userOfTeacher(cls.teacherId).id, date,
        });
      }
    }
  };
  enterResults(`Mid-Term ${now.getFullYear()}`, midDate, classes);
  enterResults(`Monthly Test ${now.getFullYear()}`, addDays(today, -8), [cDa, cDb, cGs]);

  /* ---------- admissions ---------- */
  const appNames: [string, Gender, ClassRoom, Db["applications"][number]["status"]][] = [
    ["Muhammad Shayan", "Male", cQa, "New"], ["Ayesha Batool", "Female", cQb, "New"], ["Abdul Moiz", "Male", cNa, "Under Review"],
    ["Zainab Fatima", "Female", cH1b, "Under Review"], ["Hassan Raza", "Male", cH1a, "Accepted"], ["Hira Noor", "Female", cNb, "Accepted"],
    ["Ali Haider", "Male", cGs, "Rejected"], ["Rayan Ahmed", "Male", cQa, "New"],
  ];
  const applications: AdmissionApplication[] = appNames.map(([name, gender, cls, status], i) => {
    const fam = pick(FAMILY);
    return {
      id: `APP-${pad4(i + 1)}`, applicantName: `${name}`, fatherName: `${pick(FATHER_FIRST)} ${fam}`,
      dob: addDays(today, -(int(5, 11) * 365 + int(1, 300))), gender, guardianPhone: phone(),
      address: `House ${int(1, 200)}, ${pick(AREAS)}, Lahore`, appliedClassId: cls.id, appliedDate: addDays(today, -int(1, 30)),
      previousSchool: "", status, notes: status === "Rejected" ? "Age above class limit; advised General Studies later." : "",
    };
  });

  /* ---------- documents ---------- */
  const documents: StudentDocument[] = [];
  active.slice(0, 40).forEach((s) => {
    documents.push({ id: nid("doc"), studentId: s.id, name: `${s.fullName} - B-Form.pdf`, type: "B-Form", uploadedAt: s.admissionDate + "T11:00:00.000Z", sizeKb: int(120, 900) });
    if (chance(0.6)) documents.push({ id: nid("doc"), studentId: s.id, name: `Birth Certificate.jpg`, type: "Birth Certificate", uploadedAt: s.admissionDate + "T11:05:00.000Z", sizeKb: int(150, 700) });
  });

  /* ---------- communication history ---------- */
  const mkRecipients = (list: Student[], tpl: (s: Student) => string) =>
    list.map((s) => ({ studentId: s.id, name: s.guardian.name, phone: s.guardian.phone, body: tpl(s) }));
  const unpaidIds = new Set(fees.filter((f) => !f.waived && f.month === thisMonth && !payments.some((p) => p.allocations.some((a) => a.feeId === f.id))).map((f) => f.studentId));
  const M = (type: CommunicationMessage["type"], audience: string, body: string, list: Student[], tpl: (s: Student) => string, daysAgo: number, by: AppUser): CommunicationMessage => ({
    id: nid("m"), type, audience, body, recipients: mkRecipients(list, tpl), status: "Sent", provider: "simulation", sentBy: by.name,
    sentAt: new Date(now.getTime() - daysAgo * 86400_000).toISOString(),
  });
  const feeTpl = "Assalam o Alaikum {guardian}, fee for {student} is pending. Please pay at the office. — {madrasa}";
  const messages: CommunicationMessage[] = [
    M("Fee Reminder", "Outstanding fee — this month", feeTpl, active.filter((s) => unpaidIds.has(s.id)).slice(0, 24),
      (s) => feeTpl.replace("{guardian}", s.guardian.name).replace("{student}", s.fullName).replace("{madrasa}", settings.madrasaName), 2, accountant),
    M("Attendance Alert", "Absent yesterday", "Assalam o Alaikum, {student} was absent from madrasa. Kindly inform us of the reason.",
      active.filter((s) => absentee.has(s.id)).slice(0, 5), (s) => `Assalam o Alaikum, ${s.fullName} was absent from madrasa. Kindly inform us of the reason.`, 1, manager),
    M("Announcement", "All guardians", "Madrasa will remain closed on 12 Rabi-ul-Awwal for Eid Milad-un-Nabi. Classes resume the next day.",
      active, () => "Madrasa will remain closed on 12 Rabi-ul-Awwal for Eid Milad-un-Nabi. Classes resume the next day.", 9, superAdmin),
    M("General Notice", "Class: Hifz 2 - A", "Parent–teacher meeting on Saturday after Zuhr. Attendance of guardians is requested.",
      active.filter((s) => s.classId === cH2a.id), () => "Parent–teacher meeting on Saturday after Zuhr. Attendance of guardians is requested.", 15, manager),
    M("SMS", "Single guardian", "Your son's Hifz progress is very good, Mashallah. Please continue home revision.",
      active.slice(10, 11), () => "Your son's Hifz progress is very good, Mashallah. Please continue home revision.", 20, users[3]),
    M("Fee Reminder", "Outstanding fee — last month", feeTpl, active.filter((s) => chronic.has(s.id)).slice(0, 8),
      (s) => feeTpl.replace("{guardian}", s.guardian.name).replace("{student}", s.fullName).replace("{madrasa}", settings.madrasaName), 33, accountant),
  ];

  /* ---------- activity log ---------- */
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
  const newest = [...active].sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))[0];
  const rcpt = payments.filter((p) => p.date === today).slice(0, 3);
  const nameOf = (id: string) => students.find((s) => s.id === id)?.fullName ?? id;
  const activity: ActivityEntry[] = [
    { id: nid("a"), at: ago(0.5), userId: accountant.id, userName: accountant.name, kind: "donation", text: `Donation Rs ${donations[donations.length - 1].amount.toLocaleString("en-PK")} recorded from ${donations[donations.length - 1].donorName}` },
    ...rcpt.map((p, i) => ({ id: nid("a"), at: ago(1 + i * 0.7), userId: accountant.id, userName: accountant.name, kind: "fee" as const, text: `Fee payment received — Rs ${p.amount.toLocaleString("en-PK")} from ${nameOf(p.studentId)} (${p.receiptNo})`, refId: p.studentId })),
    { id: nid("a"), at: ago(2.4), userId: userOfTeacher(t1.id).id, userName: t1.name, kind: "hifz", text: `Hifz progress updated for ${nameOf(hifz.filter((h) => h.teacherId === t1.id).slice(-1)[0]?.studentId ?? active[0].id)}`, refId: hifz.filter((h) => h.teacherId === t1.id).slice(-1)[0]?.studentId },
    { id: nid("a"), at: ago(3), userId: userOfTeacher(t8.id).id, userName: t8.name, kind: "attendance", text: `Attendance submitted for ${cNa.name} - ${cNa.section} (Morning)` },
    { id: nid("a"), at: ago(3.2), userId: userOfTeacher(t2.id).id, userName: t2.name, kind: "attendance", text: `Attendance submitted for ${cH2a.name} - ${cH2a.section} (Morning)` },
    { id: nid("a"), at: ago(5), userId: manager.id, userName: manager.name, kind: "student", text: `New student admitted — ${newest.fullName} (${newest.id})`, refId: newest.id },
    { id: nid("a"), at: ago(8), userId: manager.id, userName: manager.name, kind: "leave", text: `Leave approved for ${nameOf(leaves[0].studentId)}`, refId: leaves[0].studentId },
    { id: nid("a"), at: ago(20), userId: manager.id, userName: manager.name, kind: "communication", text: `Fee reminder sent to ${messages[0].recipients.length} guardians` },
    { id: nid("a"), at: ago(27), userId: superAdmin.id, userName: superAdmin.name, kind: "settings", text: "Fee settings updated" },
    { id: nid("a"), at: ago(30), userId: userOfTeacher(t3.id).id, userName: t3.name, kind: "exam", text: `Monthly Test results entered for ${cGs.name}` },
  ];

  return {
    version: DB_VERSION,
    settings,
    backup: { lastBackupAt: new Date(now.getTime() - 6 * 86400_000).toISOString(), lastExportAt: null, auto: false },
    counters: { student: students.length, receipt: payments.length, donation: donations.length, application: applications.length },
    users, teachers, classes, students, attendance, fees, payments, donations, hifz, results, leaves, messages,
    applications, documents, activity,
  };
}

/** Ages must stay within 5–15 for demo realism; used by a dev sanity check. */
export function ageRange(db: Db) {
  const ages = db.students.map((s) => calcAge(s.dob));
  return [Math.min(...ages), Math.max(...ages)];
}
