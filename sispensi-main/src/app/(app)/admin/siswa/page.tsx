import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { ADMIN_HOME_PATH, ROLES } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { SiswaForm } from "./siswa-form";
import { ImportForm } from "./import-form";
import { deleteStudent } from "./actions";

export default async function AdminSiswaPage() {
  await requireRole(ROLES.ADMIN);

  const supabase = await createClient();
  const [studentsRes, classesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, nis, class_id")
      .eq("role", "siswa")
      .order("full_name"),
    supabase.from("classes").select("id, name").order("name"),
  ]);

  const students = studentsRes.data ?? [];
  const classes = classesRes.data ?? [];
  const classMap = new Map(classes.map((c) => [c.id, c.name] as const));

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""] as const),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={ADMIN_HOME_PATH}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Data Master
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Siswa</h1>
        <p className="text-muted-foreground">
          Kelola akun siswa atau impor massal dari Excel/CSV.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impor dari Excel / CSV</CardTitle>
          <CardDescription>
            Kolom: <code>nama</code>, <code>email</code> (wajib); <code>kelas</code>,{" "}
            <code>nis</code>, <code>password</code> (opsional). Kelas dicocokkan
            berdasarkan nama (dibuat otomatis bila belum ada). Tanpa password →
            memakai NIS, atau <code>sipensi123</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ImportForm />
          <a
            href="/template-import-siswa.csv"
            download
            className="text-primary inline-flex w-fit items-center gap-1 text-sm hover:underline"
          >
            <Download className="size-4" /> Unduh template CSV
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Siswa (satuan)</CardTitle>
        </CardHeader>
        <CardContent>
          <SiswaForm classes={classes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar Siswa ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada siswa.</p>
          ) : (
            <ul className="divide-y">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{s.full_name ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">
                      {emailMap.get(s.id) ?? ""}
                      {s.nis ? ` · NIS ${s.nis}` : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {s.class_id ? (classMap.get(s.class_id) ?? "—") : "Tanpa kelas"}
                  </span>
                  <DeleteButton
                    id={s.id}
                    action={deleteStudent}
                    confirmText={`Hapus akun ${s.full_name ?? "siswa"}? Akun & profil dihapus permanen.`}
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
