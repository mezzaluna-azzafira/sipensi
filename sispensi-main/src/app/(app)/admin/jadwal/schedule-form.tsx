"use client";

import { useActionState } from "react";

import { createSchedule, type FormState } from "./actions";
import { DAY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";

type Option = { id: string; name: string };

const initialState: FormState = {};

export function ScheduleForm({
  classes,
  subjects,
  teachers,
}: {
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
}) {
  const [state, formAction, pending] = useActionState(
    createSchedule,
    initialState,
  );

  const missing =
    classes.length === 0 || subjects.length === 0 || teachers.length === 0;

  if (missing) {
    return (
      <div className="text-muted-foreground text-sm">
        <p>Lengkapi data berikut dulu agar bisa membuat jadwal:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {classes.length === 0 ? (
            <li>
              Belum ada <strong>kelas</strong> (tambahkan lewat data master).
            </li>
          ) : null}
          {teachers.length === 0 ? (
            <li>
              Belum ada akun <strong>guru</strong> (role guru_mapel / wali_kelas
              / guru_bk).
            </li>
          ) : null}
          {subjects.length === 0 ? (
            <li>
              Belum ada <strong>mata pelajaran</strong> (tambahkan di kartu atas).
            </li>
          ) : null}
        </ul>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="class_id">Kelas</Label>
        <SelectNative id="class_id" name="class_id" required defaultValue="">
          <option value="" disabled>
            Pilih kelas…
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject_id">Mata pelajaran</Label>
        <SelectNative id="subject_id" name="subject_id" required defaultValue="">
          <option value="" disabled>
            Pilih mapel…
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="teacher_id">Guru</Label>
        <SelectNative id="teacher_id" name="teacher_id" required defaultValue="">
          <option value="" disabled>
            Pilih guru…
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="day_of_week">Hari</Label>
        <SelectNative
          id="day_of_week"
          name="day_of_week"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Pilih hari…
          </option>
          {Object.entries(DAY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="start_time">Jam mulai</Label>
        <Input id="start_time" name="start_time" type="time" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="end_time">Jam selesai</Label>
        <Input id="end_time" name="end_time" type="time" required />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm sm:col-span-2"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800 sm:col-span-2 dark:bg-emerald-950 dark:text-emerald-300">
          Jadwal ditambahkan.
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Tambah Jadwal"}
        </Button>
      </div>
    </form>
  );
}
