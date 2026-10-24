import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import {
  ADMIN_HOME_PATH,
  ALL_ROLES,
  APPROVER_ROLES,
  ROLE_LABELS,
  ROLES,
} from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { InlineSelect } from "@/components/inline-select";
import { GuruForm } from "./guru-form";
import { ImportForm } from "./import-form";
import { deleteUser, setUserRole } from "./actions";

export default async function AdminGuruPage() {
  await requireRole(ROLES.ADMIN);

  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", [...APPROVER_ROLES])
    .order("full_name");

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""] as const),
  );

  const roleOptions = ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  const list = teachers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={ADMIN_HOME_PATH}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Data Master
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Guru</h1>
        <p className="text-muted-foreground">
          Buat akun guru dan atur perannya.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impor dari Excel / CSV</CardTitle>
          <CardDescription>
            Kolom: <code>nama</code>, <code>email</code> (wajib); <code>role</code>{" "}
            (guru_mapel / wali_kelas / guru_bk — default guru_mapel);{" "}
            <code>password</code> (opsional, default <code>sipensi123</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ImportForm />
          <a
            href="/template-import-guru.csv"
            download
            className="text-primary inline-flex w-fit items-center gap-1 text-sm hover:underline"
          >
            <Download className="size-4" /> Unduh template CSV
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Guru (satuan)</CardTitle>
        </CardHeader>
        <CardContent>
          <GuruForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Guru ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada guru.</p>
          ) : (
            <ul className="divide-y">
              {list.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{t.full_name ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">
                      {emailMap.get(t.id) ?? ""}
                    </p>
                  </div>
                  <InlineSelect
                    id={t.id}
                    value={t.role}
                    options={roleOptions}
                    action={setUserRole}
                  />
                  <DeleteButton
                    id={t.id}
                    action={deleteUser}
                    confirmText={`Hapus akun ${t.full_name ?? "guru"}? Akun & profil akan dihapus permanen.`}
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
