"use client";

import { useActionState } from "react";

import { createStudent, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";

type ClassOption = { id: string; name: string };
const initialState: FormState = {};

export function SiswaForm({ classes }: { classes: ClassOption[] }) {
  const [state, formAction, pending] = useActionState(
    createStudent,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">Nama</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password awal</Label>
          <Input
            id="password"
            name="password"
            type="text"
            minLength={6}
            required
            placeholder="min. 6 karakter"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nis">NIS</Label>
          <Input id="nis" name="nis" placeholder="opsional" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="class_id">Kelas</Label>
          <SelectNative id="class_id" name="class_id" defaultValue="">
            <option value="">— tanpa kelas —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Akun siswa berhasil dibuat.
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Membuat…" : "Tambah Siswa"}
        </Button>
      </div>
    </form>
  );
}
