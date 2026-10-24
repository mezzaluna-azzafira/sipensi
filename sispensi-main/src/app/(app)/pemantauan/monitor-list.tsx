"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRemaining } from "@/lib/dispen";

type Item = {
  id: string;
  studentName: string;
  className: string | null;
  izinLabel: string;
  durationMinutes: number | null;
  deadline: string | null;
};

export function MonitorList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Tik hitung mundur (Date.now hanya di dalam interval, bukan saat render).
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const handle = setInterval(tick, 1000);
    return () => clearInterval(handle);
  }, []);

  // Segarkan data server tiap 30 detik (siswa baru mulai / sudah kembali).
  useEffect(() => {
    const handle = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(handle);
  }, [router]);

  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => {
        const deadlineMs = it.deadline ? new Date(it.deadline).getTime() : 0;
        const remaining = nowMs == null ? null : deadlineMs - nowMs;
        const overdue = remaining != null && remaining < 0;
        return (
          <Link key={it.id} href={`/persetujuan/${it.id}`} className="group">
            <Card
              className={`py-4 transition-colors ${
                overdue
                  ? "border-destructive/50 bg-destructive/5"
                  : "group-hover:border-primary/40"
              }`}
            >
              <CardContent className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{it.studentName}</p>
                    {it.className ? (
                      <span className="text-muted-foreground text-xs">
                        · {it.className}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {it.izinLabel}
                    {it.durationMinutes ? ` · ${it.durationMinutes} menit` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[11px]">
                    {overdue ? "Terlambat" : "Sisa waktu"}
                  </p>
                  <p
                    className={`font-mono text-lg font-semibold tabular-nums ${
                      overdue ? "text-destructive" : ""
                    }`}
                  >
                    {remaining == null ? "—" : formatRemaining(remaining)}
                  </p>
                </div>
                {overdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="warning">Dispen</Badge>
                )}
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
