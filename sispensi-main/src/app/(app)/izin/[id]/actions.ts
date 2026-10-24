"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function cancelRequestAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_request", { p_request: id });

  if (error) {
    redirect(`/izin/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/izin");
  revalidatePath(`/izin/${id}`);
  redirect("/izin?cancelled=1");
}

export type DispenActionState = { error?: string; ok?: boolean };

/** Siswa menekan "Mulai Dispen" (setelah izin disetujui). */
export async function startDispenAction(
  id: string,
): Promise<DispenActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_dispen", { p_request: id });
  if (error) return { error: error.message };
  revalidatePath("/izin");
  revalidatePath(`/izin/${id}`);
  return { ok: true };
}

/** Siswa menekan "Kembali ke Sekolah". */
export async function returnDispenAction(
  id: string,
): Promise<DispenActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_dispen", { p_request: id });
  if (error) return { error: error.message };
  revalidatePath("/izin");
  revalidatePath(`/izin/${id}`);
  revalidatePath("/pemantauan");
  return { ok: true };
}
