import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { getProfile, getSessionUser } from "@/lib/auth";
import { DASHBOARD_PATH, LOGIN_PATH, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Profile } from "@/types";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH); // pengaman; umumnya sudah ditangani proxy

  const profile = await getProfile();
  if (!profile) return <AccountNotProvisioned email={user.email ?? ""} />;

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={DASHBOARD_PATH}
          aria-label="Ke beranda SIPENSI"
          className="focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px]"
        >
          <div className="bg-brand text-brand-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">SIPENSI</p>
            <p className="text-muted-foreground hidden text-xs sm:block">
              SMK Telkom Purwokerto
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <NotificationBell userId={profile.id} role={profile.role} />
          <div className="hidden text-right leading-tight sm:block">
            <p className="max-w-[10rem] truncate text-sm font-medium">
              {profile.full_name ?? "Pengguna"}
            </p>
            <p className="text-muted-foreground text-xs">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Keluar
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

function AccountNotProvisioned({ email }: { email: string }) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Akun belum aktif</CardTitle>
          <CardDescription>
            Akun <span className="font-medium">{email}</span> berhasil masuk,
            tetapi belum memiliki profil/role di SIPENSI. Hubungi Administrator
            untuk mengaktifkan akun Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              Keluar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
