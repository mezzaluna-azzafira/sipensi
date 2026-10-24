import { z } from "zod";

/**
 * Validasi environment variable yang aman diekspos ke client (prefix NEXT_PUBLIC_).
 * Divalidasi saat modul di-load agar kesalahan konfigurasi ketahuan lebih awal.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL harus berupa URL yang valid"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi"),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  throw new Error(
    "Konfigurasi environment Supabase tidak valid. Salin `.env.example` menjadi `.env.local` lalu isi nilainya.\n" +
      parsed.error.issues.map((i) => `- ${i.message}`).join("\n"),
  );
}

/** Environment variable publik yang sudah tervalidasi. */
export const env = parsed.data;

/**
 * Service role key Supabase — HANYA untuk kode server (Route Handler, Server Action,
 * atau Edge Function). Jangan pernah diimpor ke Client Component.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum di-set. Variabel ini server-only dan tidak boleh diekspos ke client.",
    );
  }
  return key;
}
