"use client";

import { useActionState } from "react";

import { createClass, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = {};

export function ClassForm() {
  const [state, formAction, pending] = useActionState(
    createClass,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_1fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nama kelas</Label>
          <Input id="name" name="name" placeholder="mis. XI RPL 1" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="grade_level">Tingkat</Label>
          <Input
            id="grade_level"
            name="grade_level"
            type="number"
            min={10}
            max={13}
            placeholder="11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="major">Jurusan</Label>
          <Input id="major" name="major" placeholder="mis. RPL" />
        </div>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Tambah Kelas"}
        </Button>
      </div>
    </form>
  );
}
