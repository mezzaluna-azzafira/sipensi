"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: LoginState = {};

export function LoginForm({ as }: { as?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  const heading =
    as === "siswa"
      ? "Masuk sebagai Siswa"
      : as === "pengajar"
        ? "Masuk sebagai Pengajar"
        : "Masuk ke SIPENSI";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="bg-brand text-brand-foreground mx-auto mb-2 flex size-11 items-center justify-center rounded-xl">
          <GraduationCap className="size-6" />
        </div>
        <CardTitle className="text-xl">{heading}</CardTitle>
        <CardDescription>
          Sistem Perizinan Siswa Digital
          <br />
          SMK Telkom Purwokerto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@smktelkom-pwt.sch.id"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
            >
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="bg-brand text-brand-foreground hover:bg-brand-dark w-full"
            disabled={pending}
          >
            {pending ? "Memproses…" : "Masuk"}
          </Button>
        </form>

        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mt-4 inline-flex w-full items-center justify-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Kembali ke beranda
        </Link>
      </CardContent>
    </Card>
  );
}
