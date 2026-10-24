import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DAY_LABELS,
  IZIN_TYPE_LABELS,
  REKAP_PATH,
  REQUEST_STATUS,
  ROLES,
  type IzinType,
  type RequestStatus,
} from "@/lib/constants";
import { isLateReturn } from "@/lib/dispen";
import { AIModal } from "@/components/ai-modal";
import { RequestBadge } from "@/components/status-badge";
import { BarList, Stat, Trend } from "@/components/rekap-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WIB_MS = 7 * 3600 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

type Req = {
  id: string;
  izin_type: IzinType;
  status: RequestStatus;
  reason: string;
  created_at: string;
  current_layer: number;
  duration_minutes: number | null;
  dispen_started_at: string | null;
  dispen_deadline: string | null;
  returned_at: string | null;
};

/** Hitung statistik profil. Di luar komponen agar bebas dari aturan purity. */
function buildStats(reqs: Req[], nowMs: number = Date.now()) {
  const byStatus = new Map<string, number>();
  const byIzin = new Map<string, number>();
  const byDay = new Map<number, number>();
  const byMonth = new Map<string, number>();
  let late = 0;
  let last30 = 0;

  for (const r of reqs) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    byIzin.set(r.izin_type, (byIzin.get(r.izin_type) ?? 0) + 1);

    const wib = new Date(new Date(r.created_at).getTime() + WIB_MS);
    const dow = wib.getUTCDay() === 0 ? 7 : wib.getUTCDay();
    byDay.set(dow, (byDay.get(dow) ?? 0) + 1);
    const mk = wib.toISOString().slice(0, 7);
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1);

    if (isLateReturn(r, nowMs) === true) late++;
    if (nowMs - new Date(r.created_at).getTime() <= 30 * 86400000) last30++;
  }

  // 6 bulan terakhir (WIB), berurutan.
  const nowWib = new Date(nowMs + WIB_MS);
  let yy = nowWib.getUTCFullYear();
  let mm = nowWib.getUTCMonth(); // 0-based
  const keys: { key: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    keys.unshift({ key: `${yy}-${String(mm + 1).padStart(2, "0")}`, label: MONTHS[mm] });
    mm -= 1;
    if (mm < 0) {
      mm = 11;
      yy -= 1;
    }
  }
  const trend = keys.map((k) => ({ label: k.label, value: byMonth.get(k.key) ?? 0 }));

  return { byStatus, byIzin, byDay, trend, late, last30 };
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(ROLES.GURU_BK, ROLES.ADMIN);
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("profiles")
    .select("id, full_name, nis, class_id")
    .eq("id", id)
    .eq("role", "siswa")
    .maybeSingle();
  if (!student) notFound();

  const [{ data: cls }, { data: reqData }] = await Promise.all([
    student.class_id
      ? admin.from("classes").select("name").eq("id", student.class_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("permission_requests")
      .select(
        "id, izin_type, status, reason, created_at, current_layer, duration_minutes, dispen_started_at, dispen_deadline, returned_at",
      )
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const reqs = (reqData ?? []) as Req[];
  const total = reqs.length;
  const stats = buildStats(reqs);
  const name = student.full_name ?? "Siswa";

  const izinItems = Object.entries(IZIN_TYPE_LABELS)
    .map(([k, label]) => ({ label, value: stats.byIzin.get(k) ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const dayItems = Object.entries(DAY_LABELS).map(([k, label]) => ({
    label,
    value: stats.byDay.get(Number(k)) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
            <Link href={REKAP_PATH}>
              <ArrowLeft className="size-4" /> Kembali ke Rekap
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-muted-foreground">
            {student.nis ? `NIS ${student.nis}` : "NIS belum diisi"}
            {cls?.name ? ` · Kelas ${cls.name}` : ""}
          </p>
        </div>
        <AIModal studentId={student.id} studentName={name} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total Pengajuan" value={total} />
        <Stat label="30 Hari Terakhir" value={stats.last30} />
        <Stat
          label="Disetujui"
          value={stats.byStatus.get(REQUEST_STATUS.APPROVED) ?? 0}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <Stat
          label="Ditolak"
          value={stats.byStatus.get(REQUEST_STATUS.REJECTED) ?? 0}
          className="text-red-600 dark:text-red-400"
        />
        <Stat
          label="Terlambat Kembali"
          value={stats.late}
          className="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Tren 6 bulan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tren Pengajuan 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada pengajuan.</p>
          ) : (
            <Trend data={stats.trend} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
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
            <CardTitle className="text-base">Pola Hari Pengajuan</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={dayItems} />
          </CardContent>
        </Card>
      </div>

      {/* Riwayat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Riwayat Pengajuan{" "}
            <span className="text-muted-foreground font-normal">
              ({total > 50 ? `50 dari ${total}` : total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada pengajuan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2 pr-3 font-medium">Tanggal</th>
                    <th className="py-2 pr-3 font-medium">Jenis</th>
                    <th className="py-2 pr-3 font-medium">Alasan</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-b last:border-0 align-top">
                      <td className="text-muted-foreground whitespace-nowrap py-2 pr-3">
                        <Link
                          href={`/izin/${r.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {dateFmt.format(new Date(r.created_at))}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{IZIN_TYPE_LABELS[r.izin_type]}</td>
                      <td className="max-w-xs py-2 pr-3">
                        <span className="line-clamp-2" title={r.reason}>
                          {r.reason}
                        </span>
                      </td>
                      <td className="py-2">
                        <RequestBadge req={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Akses halaman ini dibatasi untuk Guru BK dan Administrator.
      </p>
    </div>
  );
}
