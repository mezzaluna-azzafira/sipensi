import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/constants";
import { dispenPhase, type DispenFields } from "@/lib/dispen";

const STATUS_VARIANT: Record<
  RequestStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
  expired: "outline",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{REQUEST_STATUS_LABELS[status]}</Badge>;
}

/**
 * Badge yang sadar fase dispen: bila izin memakai timer & sudah berjalan,
 * tampilkan "Sedang Dispen" / "Terlambat Kembali" / "Sudah Kembali"; selain itu
 * tampilkan status pengajuan biasa.
 */
export function RequestBadge({
  req,
}: {
  req: DispenFields & { status: RequestStatus };
}) {
  switch (dispenPhase(req)) {
    case "active":
      return <Badge variant="warning">Sedang Dispen</Badge>;
    case "overdue":
      return <Badge variant="destructive">Terlambat Kembali</Badge>;
    case "returned":
      return <Badge variant="success">Sudah Kembali</Badge>;
    case "ready":
      return <Badge variant="success">Disetujui · Siap Dispen</Badge>;
    default:
      return <StatusBadge status={req.status} />;
  }
}
