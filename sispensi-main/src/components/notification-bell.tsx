"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ROLES, type Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string | null;
  message: string;
  is_read: boolean;
  request_id: string | null;
  created_at: string;
};

const timeFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Bunyi "ding" dua nada via Web Audio. */
function playDing(ctx: AudioContext) {
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  for (const [freq, offset] of [
    [880, 0],
    [1318.5, 0.12],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = now + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

export function NotificationBell({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const dingPendingRef = useRef(false);

  const unread = items.filter((i) => !i.is_read).length;

  // Muat notifikasi awal.
  useEffect(() => {
    let active = true;
    supabase
      .from("notifications")
      .select("id, title, message, is_read, request_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active && data) setItems(data);
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  // Buka kunci audio pada interaksi apa pun (kebijakan autoplay browser) dan
  // selalu resume bila context sempat ter-suspend (mis. tab di-background).
  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (AC) {
          try {
            audioRef.current = new AC();
          } catch {
            /* abaikan */
          }
        }
      }
      audioRef.current?.resume().catch(() => {});
    };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "click",
    ];
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  // Jika notifikasi datang saat tab tersembunyi, bunyikan saat tab kembali aktif.
  useEffect(() => {
    const onVisible = () => {
      const ctx = audioRef.current;
      if (
        document.visibilityState === "visible" &&
        dingPendingRef.current &&
        ctx
      ) {
        dingPendingRef.current = false;
        ctx.resume().catch(() => {});
        playDing(ctx);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Langganan realtime (INSERT untuk user ini).
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) =>
            prev.some((i) => i.id === n.id) ? prev : [n, ...prev].slice(0, 30),
          );
          if (document.visibilityState !== "visible") {
            dingPendingRef.current = true; // bunyikan saat tab kembali aktif
          } else if (audioRef.current) {
            playDing(audioRef.current);
          }
          toast(n.title ?? "Notifikasi", { description: n.message });
          // Segarkan data server (status pengajuan, surat, dll) tanpa reload manual.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)),
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAll() {
    const ids = items.filter((i) => !i.is_read).map((i) => i.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  }

  function hrefFor(n: Notif): string | null {
    if (!n.request_id) return null;
    return role === ROLES.SISWA
      ? `/izin/${n.request_id}`
      : `/persetujuan/${n.request_id}`;
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Notifikasi${unread ? ` (${unread} belum dibaca)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="bg-popover text-popover-foreground absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-medium">Notifikasi</p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                >
                  <CheckCheck className="size-3.5" /> Tandai semua
                </button>
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                  Belum ada notifikasi.
                </p>
              ) : (
                <ul className="divide-y">
                  {items.map((n) => {
                    const href = hrefFor(n);
                    const body = (
                      <div className="flex gap-2">
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            n.is_read ? "bg-transparent" : "bg-primary",
                          )}
                        />
                        <div className="min-w-0">
                          {n.title ? (
                            <p className="truncate text-sm font-medium">
                              {n.title}
                            </p>
                          ) : null}
                          <p className="text-muted-foreground text-sm">
                            {n.message}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {timeFmt.format(new Date(n.created_at))}
                          </p>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id} className="hover:bg-muted/50">
                        {href ? (
                          <Link
                            href={href}
                            onClick={() => {
                              markRead(n.id);
                              setOpen(false);
                            }}
                            className="block px-3 py-2.5"
                          >
                            {body}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="block w-full px-3 py-2.5 text-left"
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
