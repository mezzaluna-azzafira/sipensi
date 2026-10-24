import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookUser, CalendarClock, GraduationCap, Users } from "lucide-react";

import { requireRole } from "@/lib/auth";
import {
  ADMIN_CLASSES_PATH,
  ADMIN_SCHEDULES_PATH,
  ADMIN_STUDENTS_PATH,
  ADMIN_TEACHERS_PATH,
  ROLES,
} from "@/lib/constants";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const items: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}[] = [
  {
    icon: GraduationCap,
    title: "Siswa",
    description: "Kelola & impor data siswa dari Excel.",
    href: ADMIN_STUDENTS_PATH,
  },
  {
    icon: BookUser,
    title: "Guru",
    description: "Kelola akun & peran guru.",
    href: ADMIN_TEACHERS_PATH,
  },
  {
    icon: Users,
    title: "Kelas",
    description: "Kelola kelas & wali kelas.",
    href: ADMIN_CLASSES_PATH,
  },
  {
    icon: CalendarClock,
    title: "Jadwal Pelajaran",
    description: "Mata pelajaran & jadwal per kelas.",
    href: ADMIN_SCHEDULES_PATH,
  },
];

export default async function AdminHomePage() {
  await requireRole(ROLES.ADMIN);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Master</h1>
        <p className="text-muted-foreground">
          Kelola data referensi sistem SIPENSI.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className="group block">
              <Card className="h-full gap-3 py-5 transition-colors group-hover:border-primary/40">
                <CardHeader className="gap-2">
                  <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{it.title}</CardTitle>
                  <CardDescription>{it.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
