"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import {
  ADMIN_STUDENTS_PATH,
  ADMIN_TEACHERS_PATH,
  ROLES,
  type Role,
} from "@/lib/constants";
import { parseSheet, pickField } from "@/lib/import";

export type FormState = { error?: string; ok?: boolean };
export type ImportState = {
  error?: string;
  ok?: boolean;
  created?: number;
  failed?: number;
  errors?: string[];
};

async function isAdmin(): Promise<boolean> {
  const p = await getProfile();
  return p?.role === ROLES.ADMIN;
}

const teacherSchema = z.object({
  full_name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  email: z.email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["guru_mapel", "wali_kelas", "guru_bk"]),
});

export async function createTeacher(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Hanya admin." };

  const parsed = teacherSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, role: parsed.data.role },
  });
  if (error) {
    return {
      error: /already|registered|exists/i.test(error.message)
        ? "Email sudah terdaftar."
        : error.message,
    };
  }

  revalidatePath(ADMIN_TEACHERS_PATH);
  return { ok: true };
}

export async function setUserRole(id: string, role: string) {
  if (!(await isAdmin())) return;
  const allowed: string[] = [
    ROLES.SISWA,
    ROLES.GURU_MAPEL,
    ROLES.WALI_KELAS,
    ROLES.GURU_BK,
    ROLES.ADMIN,
  ];
  if (!allowed.includes(role)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role: role as Role }).eq("id", id);
  revalidatePath(ADMIN_TEACHERS_PATH);
}

export async function deleteUser(id: string) {
  if (!(await isAdmin())) return;
  const me = await getProfile();
  if (me?.id === id) return; // cegah hapus diri sendiri

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidatePath(ADMIN_TEACHERS_PATH);
  revalidatePath(ADMIN_STUDENTS_PATH);
}

export async function importTeachers(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  if (!(await isAdmin())) return { error: "Hanya admin." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file .xlsx atau .csv terlebih dahulu." };
  }
  if (file.size > 5 * 1024 * 1024) return { error: "Ukuran file maksimal 5MB." };

  let rows: Record<string, string>[];
  try {
    rows = await parseSheet(file);
  } catch (e) {
    return {
      error:
        "Gagal membaca file: " +
        (e instanceof Error ? e.message : "format tidak dikenali"),
    };
  }

  if (rows.length === 0) {
    return {
      error:
        "Tidak ada baris data. Baris pertama harus header: nama, email, role, password.",
    };
  }
  if (rows.length > 300) return { error: "Maksimal 300 baris per impor." };

  const validRoles: string[] = [
    ROLES.GURU_MAPEL,
    ROLES.WALI_KELAS,
    ROLES.GURU_BK,
  ];
  const admin = createAdminClient();

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2;
    const nama = pickField(row, ["nama", "name", "full_name", "nama lengkap"]);
    const email = pickField(row, ["email", "e-mail"]);
    let role = pickField(row, ["role", "peran"])
      .toLowerCase()
      .replace(/\s+/g, "_");
    const password = pickField(row, ["password", "kata sandi"]) || "sipensi123";

    if (!nama || !email) {
      errors.push(`Baris ${line}: nama/email kosong.`);
      continue;
    }
    if (!role) role = ROLES.GURU_MAPEL;
    if (!validRoles.includes(role)) {
      errors.push(
        `Baris ${line}: role "${role}" tidak valid (guru_mapel/wali_kelas/guru_bk).`,
      );
      continue;
    }
    if (password.length < 6) {
      errors.push(`Baris ${line}: password < 6 karakter.`);
      continue;
    }

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nama, role },
    });
    if (error) {
      errors.push(
        `Baris ${line} (${email}): ${
          /already|registered|exists/i.test(error.message)
            ? "email sudah terdaftar"
            : error.message
        }`,
      );
      continue;
    }
    created++;
  }

  revalidatePath(ADMIN_TEACHERS_PATH);
  return { ok: true, created, failed: errors.length, errors: errors.slice(0, 12) };
}
