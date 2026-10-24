import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ClipboardList, Paperclip } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  DASHBOARD_PATH,
  IZIN_TYPE_LABELS,
  ROLES,
  type IzinType,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PersetujuanPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.role === ROLES.SISWA) redirect(DASHBOARD_PATH);

  const supabase = await createClient();

  let query = supabase
    .from("permission_requests")
    .select(
      "id, izin_type, reason, current_layer, requested_at, created_at, current_deadline, evidence_url, student_id, class_id",
    )
    .eq("status", "pending");

  if (profile.role === ROLES.GURU_BK) {
    query = query.eq("current_layer", 3);
  } else if (profile.role !== ROLES.ADMIN) {
    // guru_mapel / wali_kelas → hanya yang ditugaskan ke saya
    query = query.eq("current_approver_id", profile.id);
  }

  const { data: requests } = await query.order("current_deadline", {
    ascending: true,
    nullsFirst: false,
  });
  const list = requests ?? [];

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Perlu Persetujuan
        </h1>
        <p className="text-muted-foreground">
          Pengajuan izin yang menunggu keputusan Anda.
        </p>
      </div>

      {done ? (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Keputusan tersimpan.
        </p>
      ) : null}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <ClipboardList className="text-muted-foreground size-6" />
            </div>
            <p className="text-muted-foreground text-sm">
              Tidak ada pengajuan yang menunggu keputusan Anda saat ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => {
            const student = studentMap.get(r.student_id);
            const className = r.class_id ? classMap.get(r.class_id) : null;
            return (
              <Link key={r.id} href={`/persetujuan/${r.id}`} className="group">
                <Card className="py-4 transition-colors group-hover:border-primary/40">
                  <CardContent className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {student?.full_name ?? "Siswa"}
                        </p>
                        {className ? (
                          <span className="text-muted-foreground text-xs">
                            · {className}
                          </span>
                        ) : null}
                        {r.evidence_url ? (
                          <Paperclip className="text-muted-foreground size-3.5 shrink-0" />
                        ) : null}
                      </div>
                      <p className="text-sm">
                        {IZIN_TYPE_LABELS[r.izin_type as IzinType]}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {r.reason}
                      </p>
                      {r.current_deadline ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Batas respons: {dateFmt.format(new Date(r.current_deadline))}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="warning">Lapis {r.current_layer}</Badge>
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
