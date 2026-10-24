import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, History } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  DASHBOARD_PATH,
  IZIN_TYPE_LABELS,
  ROLES,
  type IzinType,
  type RequestStatus,
} from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function RiwayatKeputusanPage() {
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.role === ROLES.SISWA) redirect(DASHBOARD_PATH);

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("permission_requests")
    .select(
      "id, izin_type, reason, status, decided_at, student_id, class_id",
    )
    .eq("decided_by", profile.id)
    .order("decided_at", { ascending: false });

  const list = requests ?? [];
  const studentIds = [...new Set(list.map((r) => r.student_id))];
  const classIds = [
    ...new Set(list.map((r) => r.class_id).filter((v): v is string => !!v)),
  ];

  const [studentsRes, classesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
    supabase.from("classes").select("id, name").in("id", classIds),
  ]);
  const studentMap = new Map(
    (studentsRes.data ?? []).map((s) => [s.id, s.full_name] as const),
  );
  const classMap = new Map(
    (classesRes.data ?? []).map((c) => [c.id, c.name] as const),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Riwayat Keputusan
        </h1>
        <p className="text-muted-foreground">
          Pengajuan izin yang pernah Anda putuskan.
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <History className="text-muted-foreground size-6" />
            </div>
            <p className="text-muted-foreground text-sm">
              Belum ada keputusan yang Anda buat.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => {
            const studentName = studentMap.get(r.student_id) ?? "Siswa";
            const className = r.class_id ? classMap.get(r.class_id) : null;
            return (
              <Link key={r.id} href={`/persetujuan/${r.id}`} className="group">
                <Card className="py-4 transition-colors group-hover:border-primary/40">
                  <CardContent className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{studentName}</p>
                        {className ? (
                          <span className="text-muted-foreground text-xs">
                            · {className}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm">
                        {IZIN_TYPE_LABELS[r.izin_type as IzinType]}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {r.reason}
                      </p>
                      {r.decided_at ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Diputuskan: {dateFmt.format(new Date(r.decided_at))}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={r.status as RequestStatus} />
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
