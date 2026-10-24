import Link from "next/link";
import { ChevronRight, FilePlus2, Paperclip } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  IZIN_TYPE_LABELS,
  REQUEST_STATUS,
  ROLES,
  type IzinType,
} from "@/lib/constants";
import { RequestBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function RiwayatIzinPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("permission_requests")
    .select(
      "id, izin_type, reason, status, current_layer, requested_at, created_at, evidence_url, duration_minutes, dispen_started_at, dispen_deadline, returned_at",
    )
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  const isSiswa = profile.role === ROLES.SISWA;
  const list = requests ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Riwayat Pengajuan
          </h1>
          <p className="text-muted-foreground">
            Daftar pengajuan izin Anda beserta statusnya.
          </p>
        </div>
        {isSiswa ? (
          <Button asChild>
            <Link href="/izin/ajukan">
              <FilePlus2 className="size-4" />
              Ajukan Izin
            </Link>
          </Button>
        ) : null}
      </div>

      {ok ? (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Pengajuan berhasil dikirim. Status akan diperbarui setelah diproses.
        </p>
      ) : null}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <FilePlus2 className="text-muted-foreground size-6" />
            </div>
            <div>
              <p className="font-medium">Belum ada pengajuan</p>
              <p className="text-muted-foreground text-sm">
                {isSiswa
                  ? "Ajukan izin pertama Anda secara digital."
                  : "Belum ada data pengajuan untuk akun ini."}
              </p>
            </div>
            {isSiswa ? (
              <Button asChild size="sm">
                <Link href="/izin/ajukan">Ajukan Izin</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <Link key={r.id} href={`/izin/${r.id}`} className="group">
              <Card className="py-4 transition-colors group-hover:border-primary/40">
                <CardContent className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {IZIN_TYPE_LABELS[r.izin_type as IzinType]}
                      </p>
                      {r.evidence_url ? (
                        <Paperclip className="text-muted-foreground size-3.5 shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-sm">
                      {r.reason}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {dateFmt.format(new Date(r.created_at))}
                      {r.status === REQUEST_STATUS.PENDING
                        ? ` · Menunggu Lapis ${r.current_layer}`
                        : ""}
                    </p>
                  </div>
                  <RequestBadge req={r} />
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
