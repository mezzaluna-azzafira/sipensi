import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  IZIN_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  ROLES,
  type IzinType,
  type RequestStatus,
} from "@/lib/constants";
import { isLateReturn } from "@/lib/dispen";
import {
  fetchRekapRows,
  fetchStudentMap,
  parseRekapFilters,
} from "@/lib/rekap";
import {
  buildRekapPdf,
  buildRekapXlsx,
  buildSummary,
  type ExportData,
  type ExportRow,
} from "@/lib/rekap-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS_XLSX = 20000;
const MAX_ROWS_PDF = 3000;

/**
 * GET /rekap/export?format=xlsx|pdf&from=&to=&kelas=&jenis=&q=
 * Hanya Guru BK & Admin (sama seperti halaman rekap).
 */
export async function GET(request: Request) {
  let role: string | null = null;
  try {
    role = (await getProfile())?.role ?? null;
  } catch {
    role = null;
  }
  if (!role) return new NextResponse("Silakan login terlebih dahulu.", { status: 401 });
  const allowed: readonly string[] = [ROLES.GURU_BK, ROLES.ADMIN];
  if (!allowed.includes(role)) {
    return new NextResponse("Tidak memiliki akses.", { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "xlsx";
  const filters = parseRekapFilters((k) => sp.get(k));
  const maxRows = format === "pdf" ? MAX_ROWS_PDF : MAX_ROWS_XLSX;

  try {
    const admin = createAdminClient();

    const [{ data: classes, error: clsErr }, { rows, truncated }] = await Promise.all([
      admin.from("classes").select("id, name").order("name"),
      fetchRekapRows(admin, filters, { detail: true, max: maxRows }),
    ]);
    if (clsErr) throw new Error(clsErr.message);

    const classMap = new Map((classes ?? []).map((c) => [c.id, c.name] as const));
    const students = await fetchStudentMap(admin, rows.map((r) => r.student_id));

    const now = Date.now();
    const exportRows: ExportRow[] = rows.map((r) => {
      const s = students.get(r.student_id);
      return {
        createdAt: r.created_at,
        studentName: s?.full_name ?? "-",
        nis: s?.nis ?? "",
        kelas: r.class_id ? (classMap.get(r.class_id) ?? "-") : "-",
        jenis: IZIN_TYPE_LABELS[r.izin_type as IzinType] ?? r.izin_type,
        reason: r.reason ?? "",
        status: REQUEST_STATUS_LABELS[r.status as RequestStatus] ?? r.status,
        layer: r.current_layer,
        decidedAt: r.decided_at ?? null,
        durationMin: r.duration_minutes ?? null,
        dispenStartedAt: r.dispen_started_at ?? null,
        returnedAt: r.returned_at ?? null,
        late: isLateReturn(r, now),
      };
    });

    const filterLabels = [
      filters.kelas ? `Kelas: ${classMap.get(filters.kelas) ?? filters.kelas}` : null,
      filters.jenis ? `Jenis: ${IZIN_TYPE_LABELS[filters.jenis]}` : null,
      filters.q ? `Cari siswa: ${filters.q}` : null,
    ].filter((x): x is string => x !== null);

    const data: ExportData = {
      from: filters.from,
      to: filters.to,
      filters: filterLabels,
      generatedAt: new Date(now),
      truncated,
      maxRows,
      rows: exportRows,
      summary: buildSummary(exportRows, Object.values(REQUEST_STATUS_LABELS)),
    };

    const bytes = format === "pdf" ? await buildRekapPdf(data) : await buildRekapXlsx(data);
    const filename = `rekap-izin_${filters.from}_${filters.to}.${format}`;

    return new NextResponse(bytes as BodyInit, {
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[rekap/export] gagal:", e);
    return new NextResponse(
      "Gagal membuat file ekspor. Coba persempit periode atau ulangi.",
      { status: 500 },
    );
  }
}
