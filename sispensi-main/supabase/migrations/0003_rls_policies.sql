-- ============================================================================
-- SIPENSI — Migrasi 0003: Row Level Security (RLS) + Helper
--
-- Menerapkan kontrol akses berbasis role (§8: keamanan, UU PDP) untuk seluruh
-- tabel domain. Mutasi state alur (approve/reject/eskalasi) BELUM dibuka lewat
-- RLS di sini — akan ditangani function/RPC SECURITY DEFINER pada fase fitur,
-- sehingga transisi status tidak bisa dipalsukan dari client.
--
-- Prasyarat: 0001 & 0002 sudah dijalankan.
-- Cara jalan: SQL Editor > tempel > Run (sekali saja).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) HELPER (SECURITY DEFINER agar tidak memicu rekursi RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.is_guru_bk()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role = 'guru_bk' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Apakah user saat ini Wali Kelas dari siswa tertentu?
create or replace function public.is_wali_kelas_of_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles s
    join public.classes c on c.id = s.class_id
    where s.id = p_student
      and c.homeroom_teacher_id = auth.uid()
  );
$$;

-- Apakah user saat ini pernah bertindak pada suatu pengajuan (untuk riwayat)?
create or replace function public.has_acted_on_request(p_request uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.approval_logs l
    where l.request_id = p_request and l.approver_id = auth.uid()
  );
$$;

-- Boleh melihat sebuah pengajuan? (pemilik / approver saat ini / wali kelas /
-- guru BK / admin / pernah bertindak)
create or replace function public.can_view_request(p_request uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_student  uuid;
  v_approver uuid;
begin
  select student_id, current_approver_id
    into v_student, v_approver
  from public.permission_requests
  where id = p_request;

  if not found then
    return false;
  end if;

  return public.is_admin()
      or public.is_guru_bk()
      or v_student = auth.uid()
      or v_approver = auth.uid()
      or public.is_wali_kelas_of_student(v_student)
      or public.has_acted_on_request(p_request);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) profiles — tambahan: Guru BK boleh membaca semua profil (oversight §5)
--    (kebijakan lain sudah dibuat di migrasi 0001)
-- ---------------------------------------------------------------------------
create policy "profiles_select_bk"
  on public.profiles for select to authenticated
  using (public.is_guru_bk());

-- ---------------------------------------------------------------------------
-- 3) MASTER DATA: baca untuk semua yang login, tulis hanya Admin (FR-9)
-- ---------------------------------------------------------------------------
alter table public.classes enable row level security;
create policy "classes_select_all" on public.classes
  for select to authenticated using (true);
create policy "classes_admin_all" on public.classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.subjects enable row level security;
create policy "subjects_select_all" on public.subjects
  for select to authenticated using (true);
create policy "subjects_admin_all" on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.schedules enable row level security;
create policy "schedules_select_all" on public.schedules
  for select to authenticated using (true);
create policy "schedules_admin_all" on public.schedules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.escalation_settings enable row level security;
create policy "escalation_settings_select_all" on public.escalation_settings
  for select to authenticated using (true);
create policy "escalation_settings_admin_all" on public.escalation_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) permission_requests
-- ---------------------------------------------------------------------------
alter table public.permission_requests enable row level security;

-- Baca sesuai wewenang
create policy "pr_select_scoped" on public.permission_requests
  for select to authenticated
  using (public.can_view_request(id));

-- Siswa membuat pengajuan MILIKNYA dengan state awal yang bersih
-- (mencegah siswa "menyetujui sendiri" saat insert). Penetapan approver,
-- jadwal, & deadline dilakukan server-side pada fase fitur.
create policy "pr_insert_own_student" on public.permission_requests
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.current_user_role() = 'siswa'
    and status = 'pending'
    and current_layer = 1
    and current_approver_id is null
    and matched_schedule_id is null
    and current_deadline is null
    and decided_at is null
    and decided_by is null
  );

-- Admin: akses penuh
create policy "pr_admin_all" on public.permission_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- CATATAN: approve/reject/cancel/eskalasi TIDAK dibuka via RLS UPDATE di sini.
-- Akan dibuat sebagai function SECURITY DEFINER (decide_request, cancel_request,
-- escalate_overdue_requests) pada fase fitur.

-- ---------------------------------------------------------------------------
-- 5) approval_logs (baca sesuai akses pengajuan; tulis via server/RPC)
-- ---------------------------------------------------------------------------
alter table public.approval_logs enable row level security;
create policy "logs_select_scoped" on public.approval_logs
  for select to authenticated
  using (public.can_view_request(request_id));
create policy "logs_admin_all" on public.approval_logs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) digital_letters (baca sesuai akses pengajuan; verifikasi publik via RPC)
-- ---------------------------------------------------------------------------
alter table public.digital_letters enable row level security;
create policy "letters_select_scoped" on public.digital_letters
  for select to authenticated
  using (public.can_view_request(request_id));
create policy "letters_admin_all" on public.digital_letters
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7) notifications (hanya milik sendiri; tulis via server/RPC)
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;
create policy "notif_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());
create policy "notif_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif_admin_all" on public.notifications
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8) Realtime: aktifkan notifikasi realtime (FR-8). Jalankan sekali.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
