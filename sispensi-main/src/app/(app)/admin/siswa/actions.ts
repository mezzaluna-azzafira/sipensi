"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { ADMIN_STUDENTS_PATH, ROLES } from "@/lib/constants";
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

const studentSchema = z.object({
  full_name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  email: z.email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  class_id: z.string().trim().optional(),
  nis: z.string().trim().max(30).optional(),
});

export async function createStudent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Hanya admin." };

  const parsed = studentSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    class_id: formData.get("class_id") || undefined,
    nis: formData.get("nis") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, role: "siswa" },
  });
  if (error) {
    return {
      error: /already|registered|exists/i.test(error.message)
        ? "Email sudah terdaftar."
        : error.message,
    };
  }
  if (!data.user) return { error: "Gagal membuat akun." };

  await admin
    .from("profiles")
    .update({
      class_id: parsed.data.class_id || null,
      nis: parsed.data.nis || null,
    })
    .eq("id", data.user.id);

  revalidatePath(ADMIN_STUDENTS_PATH);
  return { ok: true };
}

export async function deleteStudent(id: string) {
  if (!(await isAdmin())) return;
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidatePath(ADMIN_STUDENTS_PATH);
}

export async function importStudents(
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
        "Tidak ada baris data. Baris pertama harus header: nama, email, kelas, nis, password.",
    };
  }
  if (rows.length > 300) return { error: "Maksimal 300 baris per impor." };

  const admin = createAdminClient();
  const { data: classes } = await admin.from("classes").select("id, name");
  const classByName = new Map(
    (classes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id] as const),
  );

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nama = pickField(row, ["nama", "name", "full_name", "nama lengkap"]);
    const email = pickField(row, ["email", "e-mail"]);
    const kelas = pickField(row, ["kelas", "class"]);
    const nis = pickField(row, ["nis", "no induk", "nomor induk"]);
    const password =
      pickField(row, ["password", "kata sandi"]) || nis || "sipensi123";
    const line = i + 2;

    if (!nama || !email) {
      errors.push(`Baris ${line}: nama/email kosong.`);
      continue;
    }
    if (password.length < 6) {
      errors.push(`Baris ${line}: password < 6 karakter.`);
      continue;
    }

    let classId: string | null = null;
    if (kelas) {
      const key = kelas.toLowerCase();
      classId = classByName.get(key) ?? null;
      if (!classId) {
        const { data: nc } = await admin
          .from("classes")
          .insert({ name: kelas })
          .select("id")
          .maybeSingle();
        if (nc) {
          classId = nc.id;
          classByName.set(key, nc.id);
        }
      }
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nama, role: "siswa" },
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
    if (!data.user) {
      errors.push(`Baris ${line}: gagal membuat akun.`);
      continue;
    }
    await admin
      .from("profiles")
      .update({ class_id: classId, nis: nis || null })
      .eq("id", data.user.id);
    created++;
  }

  revalidatePath(ADMIN_STUDENTS_PATH);
  return { ok: true, created, failed: errors.length, errors: errors.slice(0, 12) };
}
