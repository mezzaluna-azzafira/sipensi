/**
 * Helper fase dispen keluar (Fitur Timer/Countdown).
 * Status "Sedang Dispen" / "Terlambat" dihitung dari timestamp pengajuan,
 * bukan dari kolom status DB — jadi tidak butuh cron untuk menandai overdue.
 */
import {
  DISPEN_PHASE,
  REQUEST_STATUS,
  type DispenPhase,
} from "@/lib/constants";

/** Field minimum yang dibutuhkan untuk menghitung fase dispen. */
export type DispenFields = {
  status: string;
  duration_minutes: number | null;
  dispen_started_at: string | null;
  dispen_deadline: string | null;
  returned_at: string | null;
};

/**
 * Tentukan fase dispen dari timestamp. `nowMs` dapat diisi agar deterministik;
 * default `Date.now()` (aman — fungsi ini bukan komponen/hook React).
 */
export function dispenPhase(
  r: DispenFields,
  nowMs: number = Date.now(),
): DispenPhase {
  if (r.duration_minutes == null) return DISPEN_PHASE.NONE;
  if (r.status !== REQUEST_STATUS.APPROVED) return DISPEN_PHASE.NONE;
  if (!r.dispen_started_at) return DISPEN_PHASE.READY;
  if (r.returned_at) return DISPEN_PHASE.RETURNED;
  if (r.dispen_deadline && nowMs > new Date(r.dispen_deadline).getTime()) {
    return DISPEN_PHASE.OVERDUE;
  }
  return DISPEN_PHASE.ACTIVE;
}

/** Format sisa waktu (ms) menjadi "MM:SS"; bernilai negatif bila sudah lewat. */
export function formatRemaining(ms: number): string {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${neg ? "-" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Apakah siswa terlambat kembali dari dispen?
 *  - null  : bukan izin bertimer / dispen belum dimulai
 *  - true  : kembali melewati batas, atau sudah lewat batas dan belum lapor kembali
 *  - false : kembali tepat waktu, atau masih dalam batas waktu
 */
export function isLateReturn(
  r: {
    dispen_started_at?: string | null;
    dispen_deadline?: string | null;
    returned_at?: string | null;
  },
  nowMs: number = Date.now(),
): boolean | null {
  if (!r.dispen_started_at || !r.dispen_deadline) return null;
  const deadline = new Date(r.dispen_deadline).getTime();
  if (r.returned_at) return new Date(r.returned_at).getTime() > deadline;
  return nowMs > deadline;
}
