"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import {
  DAY_LABELS,
  DISPEN_MAX_MINUTES,
  DISPEN_MIN_MINUTES,
  IZIN_TYPES,
  ROLES,
  STORAGE_BUCKETS,
  isTimerIzin,
  type IzinType,
} from "@/lib/constants";

const IZIN_VALUES = Object.values(IZIN_TYPES) as [IzinType, ...IzinType[]];
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const requestSchema = z.object({
  izin_type: z.enum(IZIN_VALUES, { error: "Jenis izin tidak valid" }),
  reason: z
    .string()
    .trim()
    .min(5, "Alasan minimal 5 karakter")
    .max(1000, "Alasan maksimal 1000 karakter"),
  requested_at: z.string().trim().optional(),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(DISPEN_MIN_MINUTES, `Durasi minimal ${DISPEN_MIN_MINUTES} menit`)
    .max(DISPEN_MAX_MINUTES, `Durasi maksimal ${DISPEN_MAX_MINUTES} menit`)
    .optional(),
});

export type CreateState = { error?: string };

export async function createPermissionRequest(
  _prevState: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const profile = await getProfile();
  if (!profile) return { error: "Sesi tidak valid. Silakan login ulang." };
  if (profile.role !== ROLES.SISWA) {
    return { error: "Hanya siswa yang dapat mengajukan izin." };
  }

  const parsed = requestSchema.safeParse({
    izin_type: formData.get("izin_type"),
    reason: formData.get("reason"),
    requested_at: formData.get("requested_at") || undefined,
    duration_minutes: formData.get("duration_minutes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  // Durasi wajib untuk jenis izin ber-timer (keluar_sementara / dispensasi).
  const useTimer = isTimerIzin(parsed.data.izin_type);
  if (useTimer && parsed.data.duration_minutes == null) {
    return {
      error: "Perkiraan durasi wajib untuk izin Keluar Sementara / Dispensasi.",
    };
  }

  const supabase = await createClient();

  // Upload bukti (WAJIB — antisipasi izin fiktif / siswa berbohong).
  const file = formData.get("evidence");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bukti pendukung wajib dilampirkan." };
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    return { error: "Ukuran bukti maksimal 5MB." };
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    return { error: "Bukti harus berupa gambar (JPG/PNG/WebP) atau PDF." };
  }
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  // Konvensi path: "<user_id>/<uuid>.<ext>" (folder pertama = pemilik, sesuai policy Storage)
  const evidencePath = `${profile.id}/${crypto.randomUUID()}${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.EVIDENCE)
    .upload(evidencePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: `Gagal mengunggah bukti: ${uploadError.message}` };
  }

  const requestedAt = parsed.data.requested_at
    ? new Date(parsed.data.requested_at).toISOString()
    : new Date().toISOString();

  // Insert pengajuan dalam kondisi awal bersih. Kolom status/current_layer &
  // approver dibiarkan default (pending, lapis 1, null) sesuai policy RLS.
  const { error: insertError } = await supabase
    .from("permission_requests")
    .insert({
      student_id: profile.id,
      class_id: profile.class_id,
      izin_type: parsed.data.izin_type,
      reason: parsed.data.reason,
      requested_at: requestedAt,
      evidence_url: evidencePath,
      duration_minutes: useTimer ? parsed.data.duration_minutes : null,
    });

  if (insertError) {
    // Best-effort: hapus bukti yang sudah terlanjur diunggah
    if (evidencePath) {
      await supabase.storage
        .from(STORAGE_BUCKETS.EVIDENCE)
        .remove([evidencePath]);
    }
    return { error: `Gagal menyimpan pengajuan: ${insertError.message}` };
  }

  revalidatePath("/izin");
  redirect("/izin?ok=1");
}

// ==========================================================================
// Preview jadwal saat siswa memilih waktu izin (FR-3, informatif)
// ==========================================================================
export type LookupResult =
  | {
      status: "found";
      subject: string | null;
      teacher: string | null;
      period: number;
      start: string;
      end: string;
      day: string;
    }
  | { status: "fallback"; day: string; approver: string | null }
  | { status: "no_class" };

/** Ambil bagian hari (ISO) & jam (WIB) dari string datetime-local, atau "sekarang". */
function wibParts(dtLocal: string): { dow: number; time: string } {
  let y: number, mo: number, d: number, hh: number, mi: number;
  const m = dtLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    y = +m[1];
    mo = +m[2];
    d = +m[3];
    hh = +m[4];
    mi = +m[5];
  } else {
    const wib = new Date(Date.now() + 7 * 3600 * 1000); // UTC+7
    y = wib.getUTCFullYear();
    mo = wib.getUTCMonth() + 1;
    d = wib.getUTCDate();
    hh = wib.getUTCHours();
    mi = wib.getUTCMinutes();
  }
  const jsDow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0=Minggu
  const dow = jsDow === 0 ? 7 : jsDow; // 1=Senin .. 7=Minggu
  const time = `${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}:00`;
  return { dow, time };
}

const hhmm = (t: string) => t.slice(0, 5);

export async function lookupSchedule(dtLocal: string): Promise<LookupResult> {
  const profile = await getProfile();
  if (!profile || !profile.class_id) return { status: "no_class" };

  const { dow, time } = wibParts(dtLocal ?? "");
  const dayLabel = DAY_LABELS[dow] ?? "";

  // Service role: hanya membaca jadwal/guru untuk kelas siswa itu sendiri.
  const admin = createAdminClient();
  const { data: daySchedules } = await admin
    .from("schedules")
    .select("id, subject_id, teacher_id, start_time, end_time")
    .eq("class_id", profile.class_id)
    .eq("day_of_week", dow)
    .order("start_time", { ascending: true });

  const list = daySchedules ?? [];
  const idx = list.findIndex((s) => time >= s.start_time && time < s.end_time);

  if (idx === -1) {
    const { data: klass } = await admin
      .from("classes")
      .select("homeroom_teacher_id")
      .eq("id", profile.class_id)
      .maybeSingle();
    let approver: string | null = null;
    if (klass?.homeroom_teacher_id) {
      const { data: t } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", klass.homeroom_teacher_id)
        .maybeSingle();
      approver = t?.full_name ?? null;
    }
    return { status: "fallback", day: dayLabel, approver };
  }

  const match = list[idx];
  let subject: string | null = null;
  let teacher: string | null = null;
  if (match.subject_id) {
    const { data: s } = await admin
      .from("subjects")
      .select("name")
      .eq("id", match.subject_id)
      .maybeSingle();
    subject = s?.name ?? null;
  }
  if (match.teacher_id) {
    const { data: t } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", match.teacher_id)
      .maybeSingle();
    teacher = t?.full_name ?? null;
  }

  return {
    status: "found",
    subject,
    teacher,
    period: idx + 1,
    start: hhmm(match.start_time),
    end: hhmm(match.end_time),
    day: dayLabel,
  };
}
