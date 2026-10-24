import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Paperclip } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  APPROVAL_ACTION_LABELS,
  IZIN_TYPE_LABELS,
  REQUEST_STATUS,
  STORAGE_BUCKETS,
  type ApprovalAction,
  type IzinType,
} from "@/lib/constants";
import { RequestBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CancelButton } from "./cancel-button";
import { DispenControls } from "./dispen-controls";
import { dispenPhase } from "@/lib/dispen";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function DetailIzinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const { data: req } = await supabase
    .from("permission_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // RLS akan menyembunyikan pengajuan yang tidak boleh diakses -> not found.
  if (!req) notFound();

  const [{ data: logs }, { data: letter }] = await Promise.all([
    supabase
      .from("approval_logs")
      .select("id, layer, action, note, created_at")
      .eq("request_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("digital_letters")
      .select("qr_token")
      .eq("request_id", id)
      .maybeSingle(),
  ]);

  let evidenceUrl: string | null = null;
  if (req.evidence_url) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.EVIDENCE)
      .createSignedUrl(req.evidence_url, 600);
    evidenceUrl = data?.signedUrl ?? null;
  }

  const isOwner = req.student_id === profile.id;
  const canCancel = isOwner && req.status === REQUEST_STATUS.PENDING;
  const phase = dispenPhase(req);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/izin"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Kembali ke riwayat
      </Link>

      {error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{IZIN_TYPE_LABELS[req.izin_type as IzinType]}</CardTitle>
            <RequestBadge req={req} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <Field label="Alasan">{req.reason}</Field>
          <Field label="Waktu izin">
            {dateFmt.format(new Date(req.requested_at))}
          </Field>
          {req.duration_minutes ? (
            <Field label="Durasi dispen">{req.duration_minutes} menit</Field>
          ) : null}
          <Field label="Diajukan">
            {dateFmt.format(new Date(req.created_at))}
          </Field>
          {req.status === REQUEST_STATUS.PENDING ? (
            <Field label="Menunggu">Persetujuan Lapis {req.current_layer}</Field>
          ) : null}
          {req.decided_at ? (
            <Field label="Diputuskan">
              {dateFmt.format(new Date(req.decided_at))}
            </Field>
          ) : null}

          {req.evidence_url ? (
            <Field label="Bukti pendukung">
              {evidenceUrl ? (
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <Paperclip className="size-3.5" />
                  Lihat bukti
                </a>
              ) : (
                <span className="text-muted-foreground">
                  Bukti terlampir (tautan tidak tersedia).
                </span>
              )}
            </Field>
          ) : null}

          {letter?.qr_token || canCancel ? (
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              {letter?.qr_token ? (
                <Button asChild size="sm">
                  <a
                    href={`/surat/${letter.qr_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="size-4" />
                    Unduh Surat Izin (PDF)
                  </a>
                </Button>
              ) : null}
              {canCancel ? <CancelButton id={req.id} /> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isOwner && phase !== "none" ? (
        <DispenControls
          id={req.id}
          phase={phase}
          durationMinutes={req.duration_minutes}
          dispenDeadline={req.dispen_deadline}
          returnedAt={req.returned_at}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat proses</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4">
            {(logs ?? []).map((log) => (
              <li key={log.id} className="flex gap-3">
                <span className="bg-primary mt-1.5 size-2 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {APPROVAL_ACTION_LABELS[log.action as ApprovalAction] ??
                      log.action}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · Lapis {log.layer}
                    </span>
                  </p>
                  {log.note ? (
                    <p className="text-muted-foreground text-sm">{log.note}</p>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    {dateFmt.format(new Date(log.created_at))}
                  </p>
                </div>
              </li>
            ))}
            {(logs ?? []).length === 0 ? (
              <li className="text-muted-foreground text-sm">
                Belum ada aktivitas.
              </li>
            ) : null}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
