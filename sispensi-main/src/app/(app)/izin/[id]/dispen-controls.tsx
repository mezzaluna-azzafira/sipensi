"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRemaining } from "@/lib/dispen";
import type { DispenPhase } from "@/lib/constants";
import {
  returnDispenAction,
  startDispenAction,
  type DispenActionState,
} from "./actions";

type Props = {
  id: string;
  phase: DispenPhase;
  durationMinutes: number | null;
  dispenDeadline: string | null;
  returnedAt: string | null;
};

const timeFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function DispenControls(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Hitung mundur (Date.now hanya di dalam interval, bukan saat render).
  useEffect(() => {
    if (!props.dispenDeadline) return;
    const deadline = new Date(props.dispenDeadline).getTime();
    const tick = () => setRemaining(deadline - Date.now());
    tick();
    const handle = setInterval(tick, 1000);
    return () => clearInterval(handle);
  }, [props.dispenDeadline]);

  function run(action: () => Promise<DispenActionState>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (props.phase === "none") return null;

  if (props.phase === "returned") {
    return (
      <div className="bg-muted/30 rounded-md border px-4 py-3 text-sm">
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          ✓ Sudah kembali ke sekolah
        </p>
        {props.returnedAt ? (
          <p className="text-muted-foreground text-xs">
            Tercatat pada {timeFmt.format(new Date(props.returnedAt))}
          </p>
        ) : null}
      </div>
    );
  }

  if (props.phase === "ready") {
    return (
      <div className="flex flex-col items-start gap-2 rounded-md border border-dashed px-4 py-3">
        <p className="text-sm">
          Izin disetujui. Tekan tombol saat Anda benar-benar keluar — hitung
          mundur {props.durationMinutes} menit akan berjalan.
        </p>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button
          type="button"
          disabled={pending}
          onClick={() => run(() => startDispenAction(props.id))}
        >
          <LogOut className="size-4" /> {pending ? "Memulai…" : "Mulai Dispen"}
        </Button>
      </div>
    );
  }

  // active / overdue
  const overdue = remaining != null && remaining < 0;
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-md border px-4 py-4 ${
        overdue
          ? "border-destructive/40 bg-destructive/5"
          : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <Clock
          className={overdue ? "text-destructive size-6" : "text-primary size-6"}
        />
        <div>
          <p className="text-muted-foreground text-xs">
            {overdue ? "Terlambat kembali" : "Sisa waktu dispen"}
          </p>
          <p
            className={`font-mono text-2xl font-semibold tabular-nums ${
              overdue ? "text-destructive" : ""
            }`}
          >
            {remaining == null ? "—" : formatRemaining(remaining)}
          </p>
        </div>
      </div>
      {overdue ? (
        <p className="text-destructive text-sm">
          Waktu dispen sudah habis. Segera lapor kembali ke sekolah.
        </p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button
        type="button"
        variant={overdue ? "destructive" : "default"}
        disabled={pending}
        onClick={() => run(() => returnDispenAction(props.id))}
      >
        <LogIn className="size-4" />{" "}
        {pending ? "Menyimpan…" : "Kembali ke Sekolah"}
      </Button>
    </div>
  );
}
