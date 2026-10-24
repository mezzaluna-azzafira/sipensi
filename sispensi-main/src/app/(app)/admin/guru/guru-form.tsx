"use client";

import { useActionState } from "react";

import { createTeacher, type FormState } from "./actions";
import { ROLE_LABELS, ROLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";

const initialState: FormState = {};
const roleOptions = [ROLES.GURU_MAPEL, ROLES.WALI_KELAS, ROLES.GURU_BK];

export function GuruForm() {
  const [state, formAction, pending] = useActionState(
    createTeacher,
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
          <Label htmlFor="role">Peran</Label>
          <SelectNative id="role" name="role" required defaultValue="">
            <option value="" disabled>
              Pilih peran…
            </option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
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
          Akun guru berhasil dibuat.
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Membuat…" : "Tambah Guru"}
        </Button>
      </div>
    </form>
  );
}
