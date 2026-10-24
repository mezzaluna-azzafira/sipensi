import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import {
  APPROVAL_ACTION_LABELS,
  IZIN_TYPE_LABELS,
  REQUEST_STATUS,
  ROLES,
  STORAGE_BUCKETS,
  type ApprovalAction,
  type IzinType,
} from "@/lib/constants";
import { RequestBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DecisionForm } from "./decision-form";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function PersetujuanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: req } = await supabase
    .from("permission_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!req) notFound();

  const [{ data: student }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, nis")
      .eq("id", req.student_id)
      .maybeSingle(),
    supabase
      .from("approval_logs")
      .select("id, layer, action, note, created_at")
      .eq("request_id", id)
      .order("created_at", { ascending: true }),
  ]);

  let className: string | null = null;
  if (req.class_id) {
    const { data: klass } = await supabase
      .from("classes")
      .select("name")
      .eq("id", req.class_id)
      .maybeSingle();
    className = klass?.name ?? null;
  }

  // Bukti dilihat approver lewat signed URL (service role) — akses sudah
  // dipastikan karena RLS mengizinkan pengajuan ini terbaca di atas.
  let evidenceUrl: string | null = null;
  if (req.evidence_url) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(STORAGE_BUCKETS.EVIDENCE)
      .createSignedUrl(req.evidence_url, 600);
    evidenceUrl = data?.signedUrl ?? null;
  }

  const canDecide =
    req.status === REQUEST_STATUS.PENDING &&
    (req.current_approver_id === profile.id ||
      (req.current_layer === 3 && profile.role === ROLES.GURU_BK) ||
      profile.role === ROLES.ADMIN);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/persetujuan"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{student?.full_name ?? "Siswa"}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {className ?? "Tanpa kelas"}
                {student?.nis ? ` · NIS ${student.nis}` : ""}
              </p>
            </div>
            <RequestBadge req={req} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <Field label="Jenis izin">
            {IZIN_TYPE_LABELS[req.izin_type as IzinType]}
          </Field>
          <Field label="Alasan">{req.reason}</Field>
          <Field label="Waktu izin">
            {dateFmt.format(new Date(req.requested_at))}
          </Field>
          {req.duration_minutes ? (
            <Field label="Durasi diminta">{req.duration_minutes} menit</Field>
          ) : null}
          <Field label="Diajukan">
            {dateFmt.format(new Date(req.created_at))}
          </Field>
          {req.status === REQUEST_STATUS.PENDING ? (
            <Field label="Tahap">Lapis {req.current_layer}</Field>
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
        </CardContent>
      </Card>

      {canDecide ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keputusan</CardTitle>
          </CardHeader>
          <CardContent>
            <DecisionForm requestId={req.id} />
          </CardContent>
        </Card>
      ) : req.status !== REQUEST_STATUS.PENDING ? (
        <p className="text-muted-foreground text-sm">
          Pengajuan ini sudah diputuskan.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Pengajuan ini sedang menunggu keputusan pihak lain (Lapis{" "}
          {req.current_layer}).
        </p>
      )}

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
