import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_PATH, LOGIN_PATH, type Role } from "@/lib/constants";
import type { Profile } from "@/types";

/**
 * Helper autentikasi sisi server.
 * Hanya boleh dipakai di Server Component / Server Action / Route Handler.
 * getSessionUser & getProfile dibungkus React cache() agar hanya di-query
 * sekali per request (mis. dipakai bersama oleh layout & page).
 */

/** User Supabase terverifikasi, atau null bila belum login. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Profil (termasuk role) pengguna yang sedang login, atau null. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

/**
 * Pastikan sudah login & punya profil.
 * Catatan: kasus "sudah login tapi belum punya profil" sebaiknya ditangani
 * dengan tampilan khusus di layout (lihat (app)/layout.tsx), bukan redirect,
 * agar tidak terjadi loop dengan proxy.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(LOGIN_PATH);
  return profile;
}

/** Pastikan pengguna punya salah satu role yang diizinkan. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect(DASHBOARD_PATH);
  return profile;
}
