/**
 * Konstanta domain SIPENSI (peran, status, lapis persetujuan, jenis izin, dll).
 * Menjadi satu sumber kebenaran untuk logika alur perizinan lintas aplikasi.
 */

// ========================================================================
// Peran pengguna (§5 PRD)
// ========================================================================
export const ROLES = {
  SISWA: "siswa",
  GURU_MAPEL: "guru_mapel",
  WALI_KELAS: "wali_kelas",
  GURU_BK: "guru_bk",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: readonly Role[] = Object.values(ROLES);

export const ROLE_LABELS: Record<Role, string> = {
  siswa: "Siswa",
  guru_mapel: "Guru Mata Pelajaran",
  wali_kelas: "Wali Kelas",
  guru_bk: "Guru BK / Kesiswaan",
  admin: "Administrator",
};

/** Peran yang dapat bertindak sebagai approver dalam alur berjenjang. */
export const APPROVER_ROLES: readonly Role[] = [
  ROLES.GURU_MAPEL,
  ROLES.WALI_KELAS,
  ROLES.GURU_BK,
];

// ========================================================================
// Lapis persetujuan / eskalasi (§7 PRD)
// ========================================================================
export const APPROVAL_LAYERS = {
  L1: 1,
  L2: 2,
  L3: 3,
} as const;

export type ApprovalLayer = (typeof APPROVAL_LAYERS)[keyof typeof APPROVAL_LAYERS];

/** Peran default penanggung jawab tiap lapis. */
export const LAYER_ROLE: Record<ApprovalLayer, Role> = {
  1: ROLES.GURU_MAPEL, // fallback: Wali Kelas bila tidak ada jadwal aktif (FR-3)
  2: ROLES.WALI_KELAS,
  3: ROLES.GURU_BK,
};

export const LAYER_LABELS: Record<ApprovalLayer, string> = {
  1: "Lapis 1 — Guru Mata Pelajaran",
  2: "Lapis 2 — Wali Kelas",
  3: "Lapis 3 — Guru BK",
};

/**
 * Durasi timeout default per lapis (menit) sebelum eskalasi otomatis (FR-5, §11).
 * Nilai dapat ditimpa oleh pengaturan Admin. Lapis 3 tidak dieskalasi lebih lanjut.
 */
export const DEFAULT_TIMEOUT_MINUTES: Record<ApprovalLayer, number> = {
  1: 20,
  2: 20,
  3: 30,
};

// ========================================================================
// Status pengajuan izin (§7 & §10 PRD)
// ========================================================================
export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

// ========================================================================
// Aksi pada riwayat persetujuan (tabel approval_logs, §10)
// ========================================================================
export const APPROVAL_ACTIONS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  ESCALATED: "escalated",
  CANCELLED: "cancelled",
} as const;

export type ApprovalAction =
  (typeof APPROVAL_ACTIONS)[keyof typeof APPROVAL_ACTIONS];

export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  escalated: "Eskalasi otomatis",
  cancelled: "Dibatalkan",
};

// ========================================================================
// Jenis izin (jenis_izin, FR-2). Dapat disesuaikan kebutuhan sekolah.
// ========================================================================
export const IZIN_TYPES = {
  KELUAR_SEMENTARA: "keluar_sementara",
  PULANG: "pulang",
  SAKIT: "sakit",
  KEPERLUAN_KELUARGA: "keperluan_keluarga",
  DISPENSASI: "dispensasi",
  LAINNYA: "lainnya",
} as const;

export type IzinType = (typeof IZIN_TYPES)[keyof typeof IZIN_TYPES];

export const IZIN_TYPE_LABELS: Record<IzinType, string> = {
  keluar_sementara: "Keluar Sementara (kembali ke sekolah)",
  pulang: "Pulang / Meninggalkan Sekolah",
  sakit: "Sakit",
  keperluan_keluarga: "Keperluan Keluarga",
  dispensasi: "Dispensasi Kegiatan",
  lainnya: "Lainnya",
};

// ========================================================================
// Timer / Countdown Dispen (fitur pemantauan izin keluar)
// Hanya jenis "kembali ke sekolah" yang memakai timer durasi.
// ========================================================================
export const TIMER_IZIN_TYPES: readonly IzinType[] = [
  IZIN_TYPES.KELUAR_SEMENTARA,
  IZIN_TYPES.DISPENSASI,
];

export function isTimerIzin(type: IzinType): boolean {
  return TIMER_IZIN_TYPES.includes(type);
}

/** Pilihan durasi dispen (menit) untuk siswa saat mengajukan. */
export const DISPEN_DURATION_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120] as const;
export const DISPEN_MIN_MINUTES = 5;
export const DISPEN_MAX_MINUTES = 240;

/** Fase dispen — DIHITUNG dari timestamp pengajuan, bukan nilai enum status. */
export const DISPEN_PHASE = {
  NONE: "none",
  READY: "ready", // sudah disetujui, belum menekan "Mulai Dispen"
  ACTIVE: "active", // sedang di luar, hitung mundur berjalan
  OVERDUE: "overdue", // lewat batas, belum lapor kembali
  RETURNED: "returned", // sudah lapor kembali ke sekolah
} as const;

export type DispenPhase = (typeof DISPEN_PHASE)[keyof typeof DISPEN_PHASE];

export const DISPEN_PHASE_LABELS: Record<DispenPhase, string> = {
  none: "",
  ready: "Siap Dispen",
  active: "Sedang Dispen",
  overdue: "Terlambat Kembali",
  returned: "Sudah Kembali",
};

// ========================================================================
// Rute aplikasi
// ========================================================================
export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";
export const APPROVALS_PATH = "/persetujuan";
export const APPROVAL_HISTORY_PATH = "/riwayat-keputusan";
export const PEMANTAUAN_PATH = "/pemantauan";
export const REKAP_PATH = "/rekap";
export const REKAP_EXPORT_PATH = "/rekap/export";
export const STUDENT_PROFILE_PATH = "/siswa";
export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_CLASSES_PATH = "/admin/kelas";
export const ADMIN_STUDENTS_PATH = "/admin/siswa";
export const ADMIN_TEACHERS_PATH = "/admin/guru";
export const ADMIN_SCHEDULES_PATH = "/admin/jadwal";

// Hari (ISO): 1=Senin .. 7=Minggu — dipakai tabel schedules.
export const DAY_LABELS: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

/** Halaman awal setiap peran setelah login. */
export const ROLE_HOME: Record<Role, string> = {
  siswa: DASHBOARD_PATH,
  guru_mapel: DASHBOARD_PATH,
  wali_kelas: DASHBOARD_PATH,
  guru_bk: DASHBOARD_PATH,
  admin: DASHBOARD_PATH,
};

// ========================================================================
// Supabase Storage
// Konvensi path objek: "<user_id>/<namafile>" (folder pertama = pemilik).
// ========================================================================
export const STORAGE_BUCKETS = {
  EVIDENCE: "bukti-izin", // bukti pendukung pengajuan (FR-2)
  LETTERS: "surat-izin", // surat izin PDF (FR-6)
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
