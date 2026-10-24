import Link from "next/link";
import { Download, FileText, RotateCcw, Search } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import {
  IZIN_TYPE_LABELS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REKAP_EXPORT_PATH,
  REKAP_PATH,
  ROLES,
  STUDENT_PROFILE_PATH,
  type IzinType,
  type RequestStatus,
} from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AIModal } from "@/components/ai-modal";
import { BarList, Stat, Trend } from "@/components/rekap-charts";
import {
  fetchRekapRows,
  fetchStudentMap,
  filtersToQuery,
  parseRekapFilters,
  wibDate,
} from "@/lib/rekap";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

type Search = {
  from?: string;
  to?: string;
  kelas?: string;
  jenis?: string;
  q?: string;
};

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireRole(ROLES.GURU_BK, ROLES.ADMIN);
  const sp = await searchParams;

  // Filter divalidasi (tanggal/kelas/jenis tak valid -> default) agar URL
  // sembarangan tidak membuat halaman error.
  const filters = parseRekapFilters((k) => sp[k as keyof Search]);
  const { from, to, kelas, jenis, q } = filters;

  const admin = createAdminClient();

  // Data master untuk filter.
  const { data: classes } = await admin
    .from("classes")
    .select("id, name")
    .order("name");
  const classMap = new Map((classes ?? []).map((c) => [c.id, c.name] as const));

  // Semua pengajuan sesuai filter (dipaging per 1000, maks. 10.000 baris).
  const { rows: requests, truncated } = await fetchRekapRows(admin, filters, {
    max: 10000,
  });
  const exportQuery = filtersToQuery(filters);

  // ---- Agregasi ----
  const fromD = new Date(`${from}T00:00:00+07:00`);
  const toD = new Date(`${to}T00:00:00+07:00`);
  const spanDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
  const monthly = spanDays > 31;

  const byStatus = new Map<string, number>();
  const byIzin = new Map<string, number>();
  const byClass = new Map<string, number>();
  const trend = new Map<string, number>();
  let escalatedL3 = 0;

  for (const r of requests) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    byIzin.set(r.izin_type, (byIzin.get(r.izin_type) ?? 0) + 1);
    byClass.set(r.class_id ?? "none", (byClass.get(r.class_id ?? "none") ?? 0) + 1);
    if (r.current_layer >= 3) escalatedL3++;
    const key = wibDate(new Date(r.created_at));
    const bucket = monthly ? key.slice(0, 7) : key;
    trend.set(bucket, (trend.get(bucket) ?? 0) + 1);
  }

  // Bucket berurutan untuk grafik tren.
  const trendData: { label: string; value: number }[] = [];
  if (monthly) {
    let [yy, mm] = wibDate(fromD).slice(0, 7).split("-").map(Number);
    const end = wibDate(toD).slice(0, 7);
    while (`${yy}-${String(mm).padStart(2, "0")}` <= end) {
      const key = `${yy}-${String(mm).padStart(2, "0")}`;
      trendData.push({ label: MONTHS[mm - 1], value: trend.get(key) ?? 0 });
      mm += 1;
      if (mm > 12) {
        mm = 1;
        yy += 1;
      }
    }
  } else {
    for (let i = 0; i < spanDays; i++) {
      const key = wibDate(new Date(fromD.getTime() + i * 86400000));
      trendData.push({ label: key.slice(8), value: trend.get(key) ?? 0 });
    }
  }

  const statusColor: Record<string, string> = {
    approved: "bg-emerald-500",
    rejected: "bg-red-500",
    pending: "bg-amber-500",
    cancelled: "bg-zinc-400",
    expired: "bg-zinc-400",
  };
  const statusItems = Object.values(REQUEST_STATUS).map((s) => ({
    label: REQUEST_STATUS_LABELS[s],
    value: byStatus.get(s) ?? 0,
    color: statusColor[s],
  }));
  const izinItems = Object.entries(IZIN_TYPE_LABELS)
    .map(([k, label]) => ({ label, value: byIzin.get(k) ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const classItems = [...byClass.entries()]
    .map(([id, value]) => ({
      label: id === "none" ? "Tanpa kelas" : (classMap.get(id) ?? "—"),
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Nama siswa untuk tabel (100 baris pertama).
  const tableRows = requests.slice(0, 100);
  const studentMap = await fetchStudentMap(
    admin,
    tableRows.map((r) => r.student_id),
  );

  const total = requests.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Rekapitulasi
        </h1>
        <p className="text-muted-foreground">
          Ringkasan perizinan siswa. Periode {from} s/d {to}.
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <form
            method="get"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">Dari</Label>
              <Input id="from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">Sampai</Label>
              <Input id="to" name="to" type="date" defaultValue={to} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kelas">Kelas</Label>
              <SelectNative id="kelas" name="kelas" defaultValue={kelas}>
                <option value="">Semua kelas</option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="jenis">Jenis izin</Label>
              <SelectNative id="jenis" name="jenis" defaultValue={jenis}>
                <option value="">Semua jenis</option>
                {Object.entries(IZIN_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q">Cari siswa</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="Nama siswa" />
            </div>
            <div className="flex gap-2 lg:col-span-6 lg:justify-end">
              <Button type="submit" className="flex-1 lg:flex-none">
                <Search className="size-4" /> Terapkan
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={REKAP_PATH} aria-label="Reset filter">
                  <RotateCcw className="size-4" />
                </Link>
              </Button>
              {/* <a> biasa (bukan <Link>) agar tidak di-prefetch & memicu unduhan */}
              <Button type="button" variant="outline" asChild>
                <a href={`${REKAP_EXPORT_PATH}?format=xlsx&${exportQuery}`}>
                  <Download className="size-4" /> Excel
                </a>
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={`${REKAP_EXPORT_PATH}?format=pdf&${exportQuery}`}>
                  <FileText className="size-4" /> PDF
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {truncated && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          Data sangat banyak: hanya 10.000 pengajuan terbaru yang dihitung.
          Persempit periode atau filter untuk angka yang akurat.
        </p>
      )}

      {/* KPI */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Stat label="Total Pengajuan" value={total} />
        <Stat
          label="Disetujui"
          value={byStatus.get("approved") ?? 0}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <Stat
          label="Ditolak"
          value={byStatus.get("rejected") ?? 0}
          className="text-red-600 dark:text-red-400"
        />
        <Stat
          label="Menunggu"
          value={byStatus.get("pending") ?? 0}
          className="text-amber-600 dark:text-amber-400"
        />
        <Stat label="Eskalasi Lapis 3" value={escalatedL3} />
      </div>

      {/* Tren */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tren Pengajuan {monthly ? "Bulanan" : "Harian"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">
              Tidak ada data pada periode ini.
            </p>
          ) : (
            <Trend data={trendData} />
          )}
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per Status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={statusItems} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per Jenis Izin</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={izinItems} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={classItems} />
          </CardContent>
        </Card>
      </div>

      {/* Tabel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar Pengajuan{" "}
            <span className="text-muted-foreground font-normal">
              ({total > 100 ? `100 dari ${total}` : total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tableRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2 pr-3 font-medium">Siswa</th>
                    <th className="py-2 pr-3 font-medium">Kelas</th>
                    <th className="py-2 pr-3 font-medium">Jenis</th>
                    <th className="py-2 pr-3 font-medium">Tanggal</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Analisis AI</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => {
                    const s = studentMap.get(r.student_id);

                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <Link
                            href={`${STUDENT_PROFILE_PATH}/${r.student_id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {s?.full_name ?? "—"}
                          </Link>
                          {s?.nis ? <span className="text-muted-foreground"> · {s.nis}</span> : null}
                        </td>
                        <td className="py-2 pr-3">
                          {r.class_id ? (classMap.get(r.class_id) ?? "—") : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {IZIN_TYPE_LABELS[r.izin_type as IzinType]}
                        </td>
                        <td className="text-muted-foreground py-2 pr-3">
                          {dateFmt.format(new Date(r.created_at))}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={r.status as RequestStatus} />
                        </td>
                        <td className="py-2">
                          <AIModal
                            studentId={r.student_id}
                            studentName={s?.full_name ?? "Siswa"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
