import { Clock } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { IZIN_TYPE_LABELS, ROLES, type IzinType } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorList } from "./monitor-list";

export default async function PemantauanPage() {
  // Hanya Wali Kelas, Guru BK, & Admin (RLS otomatis membatasi Wali ke kelasnya).
  await requireRole(ROLES.WALI_KELAS, ROLES.GURU_BK, ROLES.ADMIN);

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("permission_requests")
    .select(
      "id, izin_type, student_id, class_id, duration_minutes, dispen_started_at, dispen_deadline",
    )
    .eq("status", "approved")
    .not("dispen_started_at", "is", null)
    .is("returned_at", null)
    .order("dispen_deadline", { ascending: true });

  const list = rows ?? [];
  const studentIds = [...new Set(list.map((r) => r.student_id))];
  const classIds = [
    ...new Set(list.map((r) => r.class_id).filter((v): v is string => !!v)),
  ];

  const [studentsRes, classesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, nis").in("id", studentIds),
    supabase.from("classes").select("id, name").in("id", classIds),
  ]);
  const studentMap = new Map(
    (studentsRes.data ?? []).map((s) => [s.id, s] as const),
  );
  const classMap = new Map(
    (classesRes.data ?? []).map((c) => [c.id, c.name] as const),
  );

  const items = list.map((r) => ({
    id: r.id,
    studentName: studentMap.get(r.student_id)?.full_name ?? "Siswa",
    className: r.class_id ? (classMap.get(r.class_id) ?? null) : null,
    izinLabel: IZIN_TYPE_LABELS[r.izin_type as IzinType],
    durationMinutes: r.duration_minutes,
    deadline: r.dispen_deadline,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pemantauan Dispen
        </h1>
        <p className="text-muted-foreground">
          Siswa yang sedang dispen keluar sekolah. Baris merah = terlambat
          kembali (overdue).
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Clock className="text-muted-foreground size-6" />
            </div>
            <p className="text-muted-foreground text-sm">
              Tidak ada siswa yang sedang dispen keluar saat ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MonitorList items={items} />
      )}
    </div>
  );
}
