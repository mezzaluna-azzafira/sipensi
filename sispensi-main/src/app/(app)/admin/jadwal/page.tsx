import { BookOpen, CalendarClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { DAY_LABELS, ROLES } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubjectForm } from "./subject-form";
import { ScheduleForm } from "./schedule-form";
import { DeleteButton } from "./delete-button";
import { deleteSchedule, deleteSubject } from "./actions";

function hhmm(t: string) {
  return t.slice(0, 5);
}

export default async function AdminJadwalPage() {
  await requireRole(ROLES.ADMIN);

  const supabase = await createClient();
  const [classesRes, subjectsRes, teachersRes, schedulesRes] =
    await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name, code").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", [ROLES.GURU_MAPEL, ROLES.WALI_KELAS, ROLES.GURU_BK])
        .order("full_name"),
      supabase
        .from("schedules")
        .select("id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time")
        .order("day_of_week")
        .order("start_time"),
    ]);

  const classes = classesRes.data ?? [];
  const subjects = subjectsRes.data ?? [];
  const teachers = (teachersRes.data ?? []).map((t) => ({
    id: t.id,
    name: t.full_name ?? "Guru",
  }));
  const schedules = schedulesRes.data ?? [];

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name] as const));
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name] as const));

  const byClass = new Map<string, typeof schedules>();
  for (const s of schedules) {
    const arr = byClass.get(s.class_id) ?? [];
    arr.push(s);
    byClass.set(s.class_id, arr);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Kelola Jadwal Pelajaran
        </h1>
        <p className="text-muted-foreground">
          Jadwal menentukan Guru Mapel penanggung jawab (Lapis 1) secara otomatis.
        </p>
      </div>

      {/* Mata pelajaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" /> Mata Pelajaran
          </CardTitle>
          <CardDescription>
            Tambahkan mata pelajaran sebelum menyusun jadwal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SubjectForm />
          {subjects.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="bg-muted flex items-center gap-1 rounded-md py-1 pr-1 pl-3 text-sm"
                >
                  <span>
                    {s.name}
                    {s.code ? (
                      <span className="text-muted-foreground"> ({s.code})</span>
                    ) : null}
                  </span>
                  <DeleteButton
                    id={s.id}
                    action={deleteSubject}
                    confirmText={`Hapus mapel "${s.name}"?`}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Belum ada mata pelajaran.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tambah jadwal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" /> Tambah Jadwal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleForm
            classes={classes}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            teachers={teachers}
          />
        </CardContent>
      </Card>

      {/* Daftar jadwal per kelas */}
      <div className="flex flex-col gap-4">
        {classes.map((c) => {
          const rows = byClass.get(c.id) ?? [];
          return (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">{c.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Belum ada jadwal untuk kelas ini.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {rows.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 py-2 text-sm"
                      >
                        <span className="w-16 shrink-0 font-medium">
                          {DAY_LABELS[s.day_of_week]}
                        </span>
                        <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
                          {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {s.subject_id
                            ? (subjectMap.get(s.subject_id) ?? "—")
                            : "—"}
                          <span className="text-muted-foreground">
                            {" · "}
                            {s.teacher_id
                              ? (teacherMap.get(s.teacher_id) ?? "—")
                              : "—"}
                          </span>
                        </span>
                        <DeleteButton
                          id={s.id}
                          action={deleteSchedule}
                          confirmText="Hapus jadwal ini?"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
        {classes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada kelas. Tambahkan kelas terlebih dahulu (data master / SQL).
          </p>
        ) : null}
      </div>
    </div>
  );
}
