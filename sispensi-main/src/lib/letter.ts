import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  IZIN_TYPE_LABELS,
  ROLE_LABELS,
  STORAGE_BUCKETS,
  type IzinType,
  type Role,
} from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

/** Buang karakter yang tak bisa di-encode font WinAnsi (mis. emoji) agar pdf-lib tidak error. */
const clean = (t: string) => (t ?? "").replace(/[^\x00-\xff]/g, "");

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

type LetterData = {
  letterNumber: string;
  studentName: string;
  className: string;
  nis: string;
  izinType: IzinType;
  reason: string;
  requestedAt: string;
  issuedAt: string;
  approverName: string;
  approverRole: Role | null;
  decidedAt: string | null;
};

async function generateLetterPdf(
  d: LetterData,
  verifyUrl: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.09, 0.09, 0.09);
  const muted = rgb(0.42, 0.42, 0.42);
  const brand = rgb(0.79, 0.03, 0.08);
  const margin = 56;
  const labelX = margin + 120;
  let y = 800;

  const draw = (t: string, x: number, size: number, f = font, color = ink) =>
    page.drawText(clean(t), { x, y, size, font: f, color });

  // Header
  draw("SMK TELKOM PURWOKERTO", margin, 16, bold, brand);
  y -= 18;
  draw("Sistem Perizinan Siswa Digital (SIPENSI)", margin, 10, font, muted);
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.2,
    color: brand,
  });
  y -= 30;

  draw("SURAT IZIN SISWA", margin, 15, bold, ink);
  y -= 16;
  draw(`Nomor: ${d.letterNumber}`, margin, 10, font, muted);
  y -= 28;

  const row = (label: string, value: string) => {
    page.drawText(clean(label), { x: margin, y, size: 11, font, color: muted });
    const lines = wrap(value, font, 11, width - margin - labelX);
    lines.forEach((ln, i) =>
      page.drawText(ln, {
        x: labelX,
        y: y - i * 15,
        size: 11,
        font,
        color: ink,
      }),
    );
    y -= Math.max(1, lines.length) * 15 + 6;
  };

  row("Nama", d.studentName);
  row("Kelas", d.className);
  if (d.nis) row("NIS", d.nis);
  row("Jenis Izin", IZIN_TYPE_LABELS[d.izinType]);
  row("Waktu Izin", dateFmt.format(new Date(d.requestedAt)));
  row("Alasan", d.reason);

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.6,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 24;

  const approver = `Disetujui oleh ${d.approverName}${
    d.approverRole ? ` (${ROLE_LABELS[d.approverRole]})` : ""
  }`;
  draw(approver, margin, 11, font, ink);
  y -= 16;
  if (d.decidedAt) {
    draw(`pada ${dateFmt.format(new Date(d.decidedAt))} WIB`, margin, 10, font, muted);
    y -= 16;
  }
  draw(`Diterbitkan: ${dateFmt.format(new Date(d.issuedAt))} WIB`, margin, 10, font, muted);

  // QR
  const qrBuf = await QRCode.toBuffer(verifyUrl, { width: 300, margin: 1 });
  const qrImg = await doc.embedPng(qrBuf);
  const qrSize = 120;
  const qrX = width - margin - qrSize;
  const qrY = 96;
  page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Pindai untuk verifikasi", {
    x: qrX,
    y: qrY - 14,
    size: 9,
    font,
    color: muted,
  });

  page.drawText(
    "Surat ini diterbitkan secara digital dan sah tanpa tanda tangan basah.",
    { x: margin, y: 74, size: 9, font, color: muted },
  );
  page.drawText("Verifikasi keabsahan dengan memindai QR di samping.", {
    x: margin,
    y: 62,
    size: 9,
    font,
    color: muted,
  });

  return doc.save();
}

/**
 * Pastikan PDF surat ada: ambil dari Storage bila sudah dibuat, atau generate,
 * unggah ke bucket surat-izin, lalu simpan pdf_url. Memakai service role.
 */
export async function ensureLetterPdf(
  token: string,
  verifyUrl: string,
): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const admin = createAdminClient();

  const { data: letter } = await admin
    .from("digital_letters")
    .select("id, request_id, pdf_url, letter_number, issued_at")
    .eq("qr_token", token)
    .maybeSingle();
  if (!letter) return null;

  const { data: req } = await admin
    .from("permission_requests")
    .select(
      "student_id, class_id, izin_type, reason, requested_at, decided_by, decided_at",
    )
    .eq("id", letter.request_id)
    .maybeSingle();
  if (!req) return null;

  const { data: student } = await admin
    .from("profiles")
    .select("full_name, nis")
    .eq("id", req.student_id)
    .maybeSingle();

  let className = "-";
  if (req.class_id) {
    const { data } = await admin
      .from("classes")
      .select("name")
      .eq("id", req.class_id)
      .maybeSingle();
    className = data?.name ?? "-";
  }

  let approverName = "-";
  let approverRole: Role | null = null;
  if (req.decided_by) {
    const { data } = await admin
      .from("profiles")
      .select("full_name, role")
      .eq("id", req.decided_by)
      .maybeSingle();
    approverName = data?.full_name ?? "-";
    approverRole = (data?.role as Role) ?? null;
  }

  let letterNumber = letter.letter_number;
  if (!letterNumber) {
    const yr = new Date(letter.issued_at).getFullYear();
    letterNumber = `SIP/${yr}/${token.slice(0, 6).toUpperCase()}`;
    await admin
      .from("digital_letters")
      .update({ letter_number: letterNumber })
      .eq("id", letter.id);
  }

  const filename = `Surat-Izin-${letterNumber.replace(/[^\w-]/g, "_")}.pdf`;

  // Sudah pernah dibuat -> ambil dari Storage.
  if (letter.pdf_url) {
    const { data: file } = await admin.storage
      .from(STORAGE_BUCKETS.LETTERS)
      .download(letter.pdf_url);
    if (file) {
      return { bytes: new Uint8Array(await file.arrayBuffer()), filename };
    }
  }

  const bytes = await generateLetterPdf(
    {
      letterNumber,
      studentName: student?.full_name ?? "-",
      className,
      nis: student?.nis ?? "",
      izinType: req.izin_type as IzinType,
      reason: req.reason,
      requestedAt: req.requested_at,
      issuedAt: letter.issued_at,
      approverName,
      approverRole,
      decidedAt: req.decided_at,
    },
    verifyUrl,
  );

  const path = `${req.student_id}/${letter.request_id}.pdf`;
  await admin.storage
    .from(STORAGE_BUCKETS.LETTERS)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  await admin
    .from("digital_letters")
    .update({ pdf_url: path })
    .eq("id", letter.id);

  return { bytes, filename };
}
