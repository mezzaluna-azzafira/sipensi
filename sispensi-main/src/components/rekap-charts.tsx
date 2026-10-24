import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Kartu angka ringkas (KPI). */
export function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex flex-col gap-0.5">
        <span className={cn("text-2xl font-semibold tabular-nums", className)}>
          {value}
        </span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </CardContent>
    </Card>
  );
}

/** Daftar batang horizontal (label + bar + jumlah). */
export function BarList({
  items,
}: {
  items: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.every((i) => i.value === 0)) {
    return <p className="text-muted-foreground text-sm">Tidak ada data.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm" title={it.label}>
            {it.label}
          </span>
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full", it.color ?? "bg-primary")}
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm tabular-nums">
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Grafik batang vertikal sederhana untuk tren. */
export function Trend({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1">
      {data.map((d, i) => (
        <div key={i} className="flex min-w-[16px] flex-1 flex-col items-center gap-1">
          <div className="flex h-28 w-full items-end justify-center">
            <div
              className="bg-primary/80 w-3.5 rounded-t sm:w-5"
              style={{ height: `${Math.round((d.value / max) * 100)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-muted-foreground text-[10px] leading-none">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
