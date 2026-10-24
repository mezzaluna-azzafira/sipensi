import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  FilePlus2,
  History,
  Timer,
  Users,
} from "lucide-react";

import { getProfile } from "@/lib/auth";
import {
  ADMIN_HOME_PATH,
  ADMIN_SCHEDULES_PATH,
  APPROVAL_HISTORY_PATH,
  APPROVALS_PATH,
  PEMANTAUAN_PATH,
  REKAP_PATH,
  ROLE_LABELS,
  ROLES,
  type Role,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MenuItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string; // bila ada -> tile aktif (bukan "Segera")
};

/** Modul yang relevan per peran. */
function menuForRole(role: Role): MenuItem[] {
  switch (role) {
    case ROLES.SISWA:
      return [
        {
          icon: FilePlus2,
          title: "Ajukan Izin",
          description: "Buat pengajuan izin baru secara digital.",
          href: "/izin/ajukan",
        },
        {
          icon: History,
          title: "Riwayat Pengajuan",
          description: "Pantau status & unduh surat izin Anda.",
          href: "/izin",
        },
      ];
    case ROLES.GURU_MAPEL:
      return [
        {
          icon: ClipboardList,
          title: "Perlu Persetujuan",
          description: "Tinjau & putuskan pengajuan izin siswa.",
          href: APPROVALS_PATH,
        },
        {
          icon: History,
          title: "Riwayat Keputusan",
          description: "Lihat pengajuan yang pernah Anda proses.",
          href: APPROVAL_HISTORY_PATH,
        },
      ];
    case ROLES.WALI_KELAS:
      return [
        {
          icon: ClipboardList,
          title: "Perlu Persetujuan",
          description: "Tinjau & putuskan pengajuan izin siswa.",
          href: APPROVALS_PATH,
        },
        {
          icon: Timer,
          title: "Pemantauan Dispen",
          description: "Pantau siswa kelas Anda yang sedang dispen keluar.",
          href: PEMANTAUAN_PATH,
        },
        {
          icon: History,
          title: "Riwayat Keputusan",
          description: "Lihat pengajuan yang pernah Anda proses.",
          href: APPROVAL_HISTORY_PATH,
        },
      ];
    case ROLES.GURU_BK:
      return [
        {
          icon: ClipboardList,
          title: "Perlu Persetujuan",
          description: "Tinjau pengajuan eskalasi tahap akhir.",
          href: APPROVALS_PATH,
        },
        {
          icon: Timer,
          title: "Pemantauan Dispen",
          description: "Pantau seluruh siswa yang sedang dispen keluar.",
          href: PEMANTAUAN_PATH,
        },
        {
          icon: History,
          title: "Riwayat Keputusan",
          description: "Pengajuan yang pernah Anda putuskan.",
          href: APPROVAL_HISTORY_PATH,
        },
        {
          icon: BarChart3,
          title: "Dashboard Rekap",
          description: "Rekapitulasi & tren perizinan siswa.",
          href: REKAP_PATH,
        },
      ];
    case ROLES.ADMIN:
      return [
        {
          icon: Users,
          title: "Data Master",
          description: "Kelola siswa, guru, kelas & mata pelajaran.",
          href: ADMIN_HOME_PATH,
        },
        {
          icon: CalendarClock,
          title: "Jadwal Pelajaran",
          description: "Kelola mata pelajaran & jadwal per kelas.",
          href: ADMIN_SCHEDULES_PATH,
        },
        {
          icon: Timer,
          title: "Pemantauan Dispen",
          description: "Pantau seluruh siswa yang sedang dispen keluar.",
          href: PEMANTAUAN_PATH,
        },
        {
          icon: BarChart3,
          title: "Dashboard Rekap",
          description: "Rekapitulasi perizinan seluruh sekolah.",
          href: REKAP_PATH,
        },
      ];
    default:
      return [];
  }
}

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) return null; // ditangani oleh (app)/layout.tsx

  const firstName =
    (profile.full_name ?? "").trim().split(/\s+/)[0] || "Pengguna";
  const menu = menuForRole(profile.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {firstName} 👋
        </h1>
        <p className="text-muted-foreground">
          Anda masuk sebagai{" "}
          <span className="font-medium text-foreground">
            {ROLE_LABELS[profile.role]}
          </span>
          .
        </p>
      </div>

      {menu.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menu.map((item) => {
            const Icon = item.icon;
            const inner = (
              <Card
                className={cn(
                  "relative h-full gap-3 py-5",
                  item.href
                    ? "transition-colors group-hover:border-primary/40"
                    : "opacity-90",
                )}
              >
                {!item.href ? (
                  <span className="bg-muted text-muted-foreground absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    Segera
                  </span>
                ) : null}
                <CardHeader className="gap-2">
                  <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );

            return item.href ? (
              <Link key={item.title} href={item.href} className="group block">
                {inner}
              </Link>
            ) : (
              <div key={item.title}>{inner}</div>
            );
          })}
        </div>
      ) : null}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Modul aktif 🚀</CardTitle>
          <CardDescription>
            Autentikasi, role, proteksi rute, dan pengajuan izin siswa (FR-2)
            sudah berjalan. Berikutnya: auto-detect jadwal, persetujuan
            berjenjang + eskalasi, dan surat izin PDF ber-QR Code.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
