import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy Next.js 16 (pengganti Middleware).
 * Menyegarkan sesi Supabase dan menjaga rute terproteksi pada setiap request.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Jalankan pada semua path KECUALI:
     * - _next/static, _next/image (aset internal Next)
     * - favicon.ico dan berkas gambar statis
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
