"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { ADMIN_CLASSES_PATH, ROLES } from "@/lib/constants";

export type FormState = { error?: string; ok?: boolean };

async function isAdmin(): Promise<boolean> {
  const p = await getProfile();
  return p?.role === ROLES.ADMIN;
}

export async function createClass(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Hanya admin." };

  const name = String(formData.get("name") ?? "").trim();
  const gradeRaw = String(formData.get("grade_level") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();

  if (!name) return { error: "Nama kelas wajib diisi." };
  const grade_level = gradeRaw ? Number(gradeRaw) : null;
  if (
    grade_level !== null &&
    (!Number.isInteger(grade_level) || grade_level < 10 || grade_level > 13)
  ) {
    return { error: "Tingkat harus angka 10–13." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .insert({ name, grade_level, major: major || null });
  if (error) {
    return {
      error: error.code === "23505" ? "Nama kelas sudah ada." : error.message,
    };
  }

  revalidatePath(ADMIN_CLASSES_PATH);
  return { ok: true };
}

export async function setHomeroom(classId: string, teacherId: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase
    .from("classes")
    .update({ homeroom_teacher_id: teacherId || null })
    .eq("id", classId);
  revalidatePath(ADMIN_CLASSES_PATH);
}

export async function deleteClass(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("classes").delete().eq("id", id);
  revalidatePath(ADMIN_CLASSES_PATH);
}
