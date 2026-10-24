/**
 * Pembuat berkas ekspor rekap (Excel & PDF). Fungsi di sini MURNI: tidak
 * mengakses database/Next.js, hanya menerima data yang sudah siap cetak.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Row } from "exceljs";

export type ExportRow = {
  createdAt: string; // ISO UTC
  studentName: string;
  nis: string;
  kelas: string;
  jenis: string;
  reason: string;
  status: string;
  layer: number;
  decidedAt: string | null;
  durationMin: number | null;
  dispenStartedAt: string | null;
  returnedAt: string | null;
  late: boolean | null;
};

export type ExportSummary = {
  total: number;
  escalatedL3: number;
  byStatus: [string, number][];
  byJenis: [string, number][];
  byKelas: [string, number][];
};

export type ExportData = {
  from: string;
  to: string;
  filters: string[]; // mis. ["Kelas: XI RPL 1"]
  generatedAt: Date;
  truncated: boolean;
  maxRows: number;
  rows: ExportRow[];
  summary: ExportSummary;
};

const WIB_MS = 7 * 3600 * 1000;

/** Date yang digeser +7 jam agar Excel menampilkan jam WIB apa adanya. */
const toWibCell = (iso: string | null): Date | null =>
  iso ? new Date(new Date(iso).getTime() + WIB_MS) : null;

const wibText = (d: Date | string | null): string => {
  if (!d) return "";
  const x = new Date((typeof d === "string" ? new Date(d) : d).getTime() + WIB_MS);
  return x.toISOString().slice(0, 16).replace("T", " ");
};

/** Hitung ringkasan; urutan status mengikuti `statusOrder` (label). */
export function buildSummary(
  rows: ExportRow[],
  statusOrder: string[],
): ExportSummary {
  const count = (pick: (r: ExportRow) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(pick(r), (m.get(pick(r)) ?? 0) + 1);
    return m;
  };
  const st = count((r) => r.status);
  const byStatus: [string, number][] = statusOrder.map((s) => [s, st.get(s) ?? 0]);
  for (const [s, n] of st) if (!statusOrder.includes(s)) byStatus.push([s, n]);
  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return {
    total: rows.length,
    escalatedL3: rows.filter((r) => r.layer >= 3).length,
    byStatus,
    byJenis: sortDesc(count((r) => r.jenis)),
    byKelas: sortDesc(count((r) => r.kelas)),
  };
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

export async function buildRekapXlsx(d: ExportData): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIPENSI";
  wb.created = d.generatedAt;

  const styleHeader = (row: Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    row.alignment = { vertical: "middle", horizontal: "left" };
  };

  // ---- Sheet 1: Ringkasan ----
  const ws1 = wb.addWorksheet("Ringkasan");
  ws1.columns = [{ width: 40 }, { width: 12 }];
  ws1.addRow(["REKAPITULASI PERIZINAN SISWA - SIPENSI"]).font = { bold: true, size: 14 };
  ws1.addRow([`Periode: ${d.from} s/d ${d.to}`]);
  ws1.addRow([`Filter: ${d.filters.length ? d.filters.join(" | ") : "Semua data"}`]);
  ws1.addRow([`Diunduh: ${wibText(d.generatedAt)} WIB`]);
  if (d.truncated) {
    const w = ws1.addRow([
      `PERHATIAN: data dipotong pada ${d.maxRows} baris. Persempit periode/filter.`,
    ]);
    w.font = { bold: true, color: { argb: "FFB91C1C" } };
  }
  ws1.addRow([]);

  const section = (title: string, entries: [string, number][]) => {
    styleHeader(ws1.addRow([title, "Jumlah"]));
    for (const [label, value] of entries) ws1.addRow([label, value]);
    ws1.addRow([]);
  };
  section("Indikator Utama", [
    ["Total Pengajuan", d.summary.total],
    ["Eskalasi Lapis 3", d.summary.escalatedL3],
  ]);
  section("Per Status", d.summary.byStatus);
  section("Per Jenis Izin", d.summary.byJenis);
  section("Per Kelas", d.summary.byKelas);

  // ---- Sheet 2: Daftar Pengajuan ----
  const fmt = "dd/mm/yyyy hh:mm";
  const ws2 = wb.addWorksheet("Daftar Pengajuan", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws2.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Tanggal Pengajuan (WIB)", key: "created", width: 22, style: { numFmt: fmt } },
    { header: "Nama Siswa", key: "name", width: 28 },
    { header: "NIS", key: "nis", width: 14 },
    { header: "Kelas", key: "kelas", width: 14 },
    { header: "Jenis Izin", key: "jenis", width: 34 },
    { header: "Alasan", key: "reason", width: 46 },
    { header: "Status", key: "status", width: 22 },
    { header: "Lapis Terakhir", key: "layer", width: 14 },
    { header: "Diputuskan (WIB)", key: "decided", width: 22, style: { numFmt: fmt } },
    { header: "Durasi (menit)", key: "dur", width: 14 },
    { header: "Mulai Dispen (WIB)", key: "dstart", width: 22, style: { numFmt: fmt } },
    { header: "Kembali (WIB)", key: "ret", width: 22, style: { numFmt: fmt } },
    { header: "Terlambat Kembali", key: "late", width: 18 },
  ];
  styleHeader(ws2.getRow(1));

  d.rows.forEach((r, i) => {
    ws2.addRow({
      no: i + 1,
      created: toWibCell(r.createdAt),
      name: r.studentName,
      nis: r.nis,
      kelas: r.kelas,
      jenis: r.jenis,
      reason: r.reason,
      status: r.status,
      layer: r.layer,
      decided: toWibCell(r.decidedAt),
      dur: r.durationMin,
      dstart: toWibCell(r.dispenStartedAt),
      ret: toWibCell(r.returnedAt),
      late: r.late == null ? "" : r.late ? "Ya" : "Tidak",
    });
  });
  ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };
  ws2.getColumn("reason").alignment = { wrapText: true, vertical: "top" };

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

/* ------------------------------------------------------------------ */
/* PDF (A4 landscape)                                                  */
/* ------------------------------------------------------------------ */

// Font standar PDF hanya mendukung WinAnsi; karakter lain diganti "?".
const clean = (s: string) =>
  s
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2022]/g, "?");

function fit(text: string, width: number, size: number, font: PDFFont): string {
  const t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(t.slice(0, mid) + "...", size) <= width) lo = mid;
    else hi = mid - 1;
  }
  return t.slice(0, lo) + "...";
}

export async function buildRekapPdf(d: ExportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Rekap Perizinan ${d.from} s/d ${d.to}`);
  pdf.setCreator("SIPENSI");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 841.89;
  const H = 595.28;
  const M = 36;
  const ink = rgb(0.12, 0.16, 0.22);
  const muted = rgb(0.42, 0.45, 0.5);

  const cols = [
    { label: "No", w: 28 },
    { label: "Tanggal (WIB)", w: 86 },
    { label: "Siswa", w: 150 },
    { label: "Kelas", w: 64 },
    { label: "Jenis Izin", w: 140 },
    { label: "Status", w: 90 },
    { label: "Alasan", w: 212 },
  ];
  const ROW_H = 15;

  const pages: PDFPage[] = [];
  let page = pdf.addPage([W, H]);
  pages.push(page);
  let y = H - M;

  const text = (
    s: string, x: number, yy: number, size = 9, f: PDFFont = font, color = ink,
  ) => page.drawText(clean(s), { x, y: yy, size, font: f, color });

  // ---- Judul & metadata ----
  text("REKAPITULASI PERIZINAN SISWA", M, y - 14, 16, bold);
  text("SIPENSI - SMK Telkom Purwokerto", M, y - 28, 9, font, muted);
  y -= 46;
  text(`Periode: ${d.from} s/d ${d.to}`, M, y, 9);
  y -= 12;
  text(
    `Filter: ${d.filters.length ? d.filters.join(" | ") : "Semua data"}`,
    M, y, 9,
  );
  y -= 12;
  text(`Diunduh: ${wibText(d.generatedAt)} WIB`, M, y, 9, font, muted);
  y -= 16;
  if (d.truncated) {
    text(
      `PERHATIAN: data dipotong pada ${d.maxRows} baris. Persempit periode/filter.`,
      M, y, 9, bold, rgb(0.72, 0.11, 0.11),
    );
    y -= 14;
  }

  // ---- Ringkasan (3 kolom) ----
  const stat = d.summary.byStatus.map(([l, n]) => `${l}: ${n}`).join("   |   ");
  text(`Total ${d.summary.total}   |   Eskalasi Lapis 3: ${d.summary.escalatedL3}`, M, y, 10, bold);
  y -= 13;
  text(stat, M, y, 8.5, font, muted);
  y -= 18;

  const block = (title: string, entries: [string, number][], x: number, w: number) => {
    let yy = y;
    text(title, x, yy, 9, bold);
    yy -= 12;
    const top = entries.slice(0, 7);
    for (const [label, n] of top) {
      text(fit(label, w - 34, 8.5, font), x, yy, 8.5);
      const ns = String(n);
      text(ns, x + w - 8 - font.widthOfTextAtSize(ns, 8.5), yy, 8.5);
      yy -= 11;
    }
    if (entries.length > top.length) {
      text(`+ ${entries.length - top.length} lainnya`, x, yy, 8, font, muted);
    }
  };
  if (d.rows.length > 0) {
    const bw = (W - 2 * M - 40) / 3;
    block("Per Jenis Izin", d.summary.byJenis, M, bw);
    block("Per Kelas", d.summary.byKelas, M + bw + 20, bw);
    const shown = Math.min(7, Math.max(d.summary.byJenis.length, d.summary.byKelas.length));
    const more =
      d.summary.byJenis.length > 7 || d.summary.byKelas.length > 7 ? 1 : 0;
    y -= (shown + more) * 11 + 12 + 16;
  }

  // ---- Tabel ----
  const drawHeader = () => {
    page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: ROW_H, color: rgb(0.12, 0.16, 0.22) });
    let x = M + 4;
    for (const c of cols) {
      text(c.label, x, y, 8, bold, rgb(1, 1, 1));
      x += c.w;
    }
    y -= ROW_H;
  };

  if (d.rows.length === 0) {
    text("Tidak ada data pada periode / filter ini.", M, y, 10, font, muted);
  } else {
    if (y < M + 3 * ROW_H) {
      page = pdf.addPage([W, H]);
      pages.push(page);
      y = H - M;
    }
    drawHeader();
    d.rows.forEach((r, i) => {
      if (y < M + 18) {
        page = pdf.addPage([W, H]);
        pages.push(page);
        y = H - M;
        drawHeader();
      }
      if (i % 2 === 1) {
        page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: ROW_H, color: rgb(0.96, 0.97, 0.98) });
      }
      const cells = [
        String(i + 1),
        wibText(r.createdAt),
        r.nis ? `${r.studentName} (${r.nis})` : r.studentName,
        r.kelas,
        r.jenis,
        r.status,
        r.reason,
      ];
      let x = M + 4;
      cells.forEach((c, k) => {
        text(fit(c, cols[k].w - 6, 8, font), x, y, 8);
        x += cols[k].w;
      });
      y -= ROW_H;
    });
  }

  // ---- Footer (nomor halaman) ----
  pages.forEach((p, i) => {
    p.drawText(`SIPENSI - Rekap Perizinan   |   Halaman ${i + 1} dari ${pages.length}`, {
      x: M,
      y: 18,
      size: 8,
      font,
      color: muted,
    });
  });

  return pdf.save();
}
