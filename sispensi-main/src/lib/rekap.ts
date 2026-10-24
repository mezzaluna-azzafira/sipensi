/**
 * Pemuat data rekap yang dipakai bersama oleh halaman /rekap dan endpoint
 * /rekap/export. Mengambil data per 1000 baris karena PostgREST (Supabase)
 * membatasi satu request maksimal 1000 baris — `.limit(5000)` saja TIDAK cukup.
 */
import { IZIN_TYPE_LABELS, type IzinType, type RequestStatus } from "@/lib/constants";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const WIB_MS = 7 * 3600 * 1000;
const PAGE_SIZE = 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export const wibDate = (d: Date) =>
  new Date(d.getTime() + WIB_MS).toISOString().slice(0, 10);

/** Rentang default: 30 hari terakhir (WIB). */
export function defaultRange(nowMs: number = Date.now()): { from: string; to: string } {
  const nowWib = new Date(nowMs + WIB_MS);
  return {
    to: nowWib.toISOString().slice(0, 10),
    from: new Date(nowWib.getTime() - 29 * 86400000).toISOString().slice(0, 10),
  };
}

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export type RekapFilters = {
  from: string;
  to: string;
  kelas: string;
  jenis: IzinType | "";
  q: string;
};

/** Baca & validasi filter dari query string (nilai tak valid -> default). */
export function parseRekapFilters(
  get: (key: string) => string | null | undefined,
): RekapFilters {
  const def = defaultRange();
  let from = (get("from") ?? "").trim();
  let to = (get("to") ?? "").trim();
  if (!isRealDate(from)) from = def.from;
  if (!isRealDate(to)) to = def.to;
  if (from > to) [from, to] = [to, from];

  const kelasRaw = (get("kelas") ?? "").trim();
  const jenisRaw = (get("jenis") ?? "").trim();

  return {
    from,
    to,
    kelas: UUID_RE.test(kelasRaw) ? kelasRaw : "",
    jenis: jenisRaw in IZIN_TYPE_LABELS ? (jenisRaw as IzinType) : "",
    q: (get("q") ?? "").trim().slice(0, 100),
  };
}

/** Query string untuk tautan ekspor (hanya filter yang terisi). */
export function filtersToQuery(f: RekapFilters): string {
  const p = new URLSearchParams({ from: f.from, to: f.to });
  if (f.kelas) p.set("kelas", f.kelas);
  if (f.jenis) p.set("jenis", f.jenis);
  if (f.q) p.set("q", f.q);
  return p.toString();
}

export type RekapRow = {
  id: string;
  student_id: string;
  class_id: string | null;
  izin_type: IzinType;
  status: RequestStatus;
  current_layer: number;
  created_at: string;
  // Hanya terisi bila detail = true
  reason?: string;
  decided_at?: string | null;
  duration_minutes?: number | null;
  dispen_started_at?: string | null;
  dispen_deadline?: string | null;
  returned_at?: string | null;
};

const BASIC_COLS =
  "id, student_id, class_id, izin_type, status, current_layer, created_at";
const DETAIL_COLS =
  BASIC_COLS +
  ", reason, decided_at, duration_minutes, dispen_started_at, dispen_deadline, returned_at";

/** Ambil SEMUA pengajuan sesuai filter (dipaging), maksimal `max` baris. */
export async function fetchRekapRows(
  admin: Admin,
  f: RekapFilters,
  opts: { detail?: boolean; max?: number } = {},
): Promise<{ rows: RekapRow[]; truncated: boolean }> {
  const max = opts.max ?? 10000;
  const cols = opts.detail ? DETAIL_COLS : BASIC_COLS;

  // Filter nama siswa -> daftar id.
  let studentIds: string[] | null = null;
  if (f.q) {
    const { data: matched, error } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "siswa")
      .ilike("full_name", `%${f.q}%`);
    if (error) throw new Error(error.message);
    studentIds = (matched ?? []).map((m) => m.id);
    if (studentIds.length === 0) return { rows: [], truncated: false };
  }

  const rows: RekapRow[] = [];
  let truncated = false;

  for (let offset = 0; offset < max; offset += PAGE_SIZE) {
    let query = admin
      .from("permission_requests")
      .select(cols)
      .gte("created_at", `${f.from}T00:00:00+07:00`)
      .lte("created_at", `${f.to}T23:59:59+07:00`);
    if (f.kelas) query = query.eq("class_id", f.kelas);
    if (f.jenis) query = query.eq("izin_type", f.jenis);
    if (studentIds) query = query.in("student_id", studentIds);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, Math.min(offset + PAGE_SIZE, max) - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as RekapRow[];
    rows.push(...batch);

    if (batch.length < Math.min(PAGE_SIZE, max - offset)) break;
    if (offset + PAGE_SIZE >= max) truncated = true;
  }

  return { rows, truncated };
}

export type StudentLite = { id: string; full_name: string | null; nis: string | null };

/** Nama & NIS siswa (dipecah per 200 id agar URL `.in()` tidak kepanjangan). */
export async function fetchStudentMap(
  admin: Admin,
  ids: string[],
): Promise<Map<string, StudentLite>> {
  const map = new Map<string, StudentLite>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, nis")
      .in("id", unique.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const s of data ?? []) map.set(s.id, s);
  }
  return map;
}
