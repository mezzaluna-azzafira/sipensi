import type { Metadata } from "next";
import { CheckCircle2, GraduationCap, ShieldX } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  IZIN_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type IzinType,
  type RequestStatus,
} from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Verifikasi Surat Izin" };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});
const dateOnly = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let info: {
    valid: boolean;
    student_name: string | null;
    class_name: string | null;
    izin_type: IzinType;
    requested_at: string;
    status: RequestStatus;
    issued_at: string;
    decided_at: string | null;
  } | null = null;

  if (UUID.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("verify_letter", { p_token: token });
    info = data?.[0] ?? null;
  }

  return (
    <main className="bg-muted/40 flex min-h-svh flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="bg-primary text-primary-foreground mx-auto mb-1 flex size-11 items-center justify-center rounded-xl">
            <GraduationCap className="size-6" />
          </div>
          <CardTitle className="text-lg">Verifikasi Surat Izin</CardTitle>
          <p className="text-muted-foreground text-sm">
            SIPENSI — SMK Telkom Purwokerto
          </p>
        </CardHeader>
        <CardContent>
          {!info ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <ShieldX className="text-destructive size-10" />
              <p className="font-medium">Surat tidak ditemukan</p>
              <p className="text-muted-foreground text-sm">
                QR Code tidak valid atau surat tidak terdaftar di sistem.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {info.valid ? (
                <div className="flex items-center gap-2 rounded-md bg-emerald-100 px-3 py-2 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="size-5" />
                  <span className="font-medium">Surat Izin SAH</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <ShieldX className="size-5" />
                  <span className="font-medium">
                    Surat tidak berlaku (
                    {REQUEST_STATUS_LABELS[info.status]})
                  </span>
                </div>
              )}
              <dl className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
                <dt className="text-muted-foreground">Nama</dt>
                <dd className="font-medium">{info.student_name ?? "-"}</dd>
                <dt className="text-muted-foreground">Kelas</dt>
                <dd>{info.class_name ?? "-"}</dd>
                <dt className="text-muted-foreground">Jenis Izin</dt>
                <dd>{IZIN_TYPE_LABELS[info.izin_type]}</dd>
                <dt className="text-muted-foreground">Waktu Izin</dt>
                <dd>{dateFmt.format(new Date(info.requested_at))}</dd>
                {info.decided_at ? (
                  <>
                    <dt className="text-muted-foreground">Disetujui</dt>
                    <dd>{dateFmt.format(new Date(info.decided_at))}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Diterbitkan</dt>
                <dd>{dateOnly.format(new Date(info.issued_at))}</dd>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
