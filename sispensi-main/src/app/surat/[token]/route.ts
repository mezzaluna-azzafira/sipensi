import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ensureLetterPdf } from "@/lib/letter";
import { LOGIN_PATH } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  // Otorisasi lewat RLS: user hanya bisa membaca surat yang berhak ia lihat.
  const { data: allowed } = await supabase
    .from("digital_letters")
    .select("id")
    .eq("qr_token", token)
    .maybeSingle();
  if (!allowed) {
    return new NextResponse("Tidak diizinkan atau surat tidak ditemukan.", {
      status: 403,
    });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const verifyUrl = `${origin}/verify/${token}`;

  const result = await ensureLetterPdf(token, verifyUrl);
  if (!result) {
    return new NextResponse("Surat tidak ditemukan.", { status: 404 });
  }

  return new NextResponse(result.bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
