"use client";

import { useActionState } from "react";

import { createSubject, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: FormState = {};

export function SubjectForm() {
  const [state, formAction, pending] = useActionState(
    createSubject,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="name"
          placeholder="Nama mapel (mis. Pemrograman Web)"
          required
          className="flex-1"
        />
        <Input name="code" placeholder="Kode (opsional)" className="sm:w-40" />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Tambah"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
    </form>
  );
}
