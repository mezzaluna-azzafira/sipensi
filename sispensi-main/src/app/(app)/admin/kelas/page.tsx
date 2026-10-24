import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ADMIN_HOME_PATH, APPROVER_ROLES, ROLES } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { InlineSelect } from "@/components/inline-select";
import { ClassForm } from "./class-form";
import { deleteClass, setHomeroom } from "./actions";

export default async function AdminKelasPage() {
  await requireRole(ROLES.ADMIN);

  const supabase = await createClient();
  const [classesRes, teachersRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, grade_level, major, homeroom_teacher_id")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", [...APPROVER_ROLES])
      .order("full_name"),
  ]);

  const classes = classesRes.data ?? [];
  const teacherOptions = (teachersRes.data ?? []).map((t) => ({
    value: t.id,
    label: t.full_name ?? "Guru",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={ADMIN_HOME_PATH}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Data Master
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Kelas</h1>
        <p className="text-muted-foreground">
          Kelola kelas dan tetapkan wali kelas (approver fallback).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar Kelas ({classes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada kelas.</p>
          ) : (
            <ul className="divide-y">
              {classes.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.grade_level ? `Tingkat ${c.grade_level}` : "—"}
                      {c.major ? ` · ${c.major}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">Wali:</span>
                    <InlineSelect
                      id={c.id}
                      value={c.homeroom_teacher_id}
                      options={teacherOptions}
                      action={setHomeroom}
                      allowEmpty
                      emptyLabel="— tanpa wali —"
                    />
                  </div>
                  <DeleteButton
                    id={c.id}
                    action={deleteClass}
                    confirmText={`Hapus kelas "${c.name}"? Jadwal kelas ini ikut terhapus.`}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
