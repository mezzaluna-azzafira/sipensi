import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/constants";

/** Keluar (sign out) lalu arahkan kembali ke halaman login. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 agar POST diarahkan menjadi GET ke halaman login.
  return NextResponse.redirect(new URL(LOGIN_PATH, request.url), {
    status: 303,
  });
}
