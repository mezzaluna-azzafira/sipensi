-- ============================================================================
-- SIPENSI — Migrasi 0008: Timer / Countdown Dispen Keluar (Fitur 2 & 3)
--
-- Menambah siklus "dispen keluar" untuk jenis izin keluar_sementara & dispensasi:
--   duration_minutes  : estimasi durasi keluar (menit), diisi siswa saat mengajukan
--   dispen_started_at  : saat siswa menekan "Mulai Dispen" (setelah disetujui)
--   dispen_deadline    : dispen_started_at + durasi (bisa diperpanjang, migrasi 0009)
--   returned_at        : saat siswa menekan "Kembali ke Sekolah"
--
-- Status "Sedang Dispen" / "Terlambat Kembali" DIHITUNG dari timestamp di atas
-- (bukan nilai enum baru) sehingga tidak perlu mengubah enum request_status dan
-- tidak butuh cron untuk menandai overdue.
--
-- Prasyarat: 0001–0007. Cara jalan: SQL Editor > tempel > Run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Kolom siklus dispen
-- ---------------------------------------------------------------------------
alter table public.permission_requests
  add column if not exists duration_minutes  integer,
  add column if not exists dispen_started_at timestamptz,
  add column if not exists dispen_deadline   timestamptz,
  add column if not exists returned_at        timestamptz;

alter table public.permission_requests
  drop constraint if exists pr_duration_range;
alter table public.permission_requests
  add constraint pr_duration_range
  check (duration_minutes is null or (duration_minutes between 5 and 240));

comment on column public.permission_requests.duration_minutes is
  'Estimasi durasi dispen keluar (menit) untuk keluar_sementara/dispensasi. NULL = tanpa timer.';

-- ---------------------------------------------------------------------------
-- 2) Perketat policy insert: bukti WAJIB + state dispen awal harus bersih
--    (menggantikan versi di 0007).
-- ---------------------------------------------------------------------------
drop policy if exists "pr_insert_own_student" on public.permission_requests;
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
    -- Bukti WAJIB (anti izin fiktif).
    and evidence_url is not null
    and length(btrim(evidence_url)) > 0
    -- State dispen awal bersih (diisi lewat RPC setelah disetujui).
    and dispen_started_at is null
    and dispen_deadline is null
    and returned_at is null
  );

-- ---------------------------------------------------------------------------
-- 3) RPC: mulai dispen (siswa pemilik, hanya setelah disetujui)
-- ---------------------------------------------------------------------------
create or replace function public.start_dispen(p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.permission_requests;
begin
  select * into r from public.permission_requests where id = p_request for update;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if r.student_id <> auth.uid() then
    raise exception 'Anda tidak berwenang atas pengajuan ini';
  end if;
  if r.status <> 'approved' then
    raise exception 'Izin belum disetujui';
  end if;
  if r.duration_minutes is null then
    raise exception 'Izin ini tidak memakai timer dispen';
  end if;
  if r.dispen_started_at is not null then
    raise exception 'Dispen sudah dimulai sebelumnya';
  end if;

  update public.permission_requests
    set dispen_started_at = now(),
        dispen_deadline   = now() + make_interval(mins => r.duration_minutes),
        updated_at        = now()
  where id = r.id;

  return r.id;
end;
$$;

grant execute on function public.start_dispen(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC: lapor kembali ke sekolah
-- ---------------------------------------------------------------------------
create or replace function public.return_dispen(p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.permission_requests;
begin
  select * into r from public.permission_requests where id = p_request for update;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if r.student_id <> auth.uid() and not public.is_admin() then
    raise exception 'Anda tidak berwenang atas pengajuan ini';
  end if;
  if r.dispen_started_at is null then
    raise exception 'Dispen belum dimulai';
  end if;
  if r.returned_at is not null then
    raise exception 'Kepulangan sudah tercatat';
  end if;

  update public.permission_requests
    set returned_at = now(), updated_at = now()
  where id = r.id;

  -- Beri tahu guru yang menyetujui bahwa siswa sudah kembali.
  if r.decided_by is not null then
    insert into public.notifications (user_id, request_id, title, message)
    values (r.decided_by, r.id, 'Siswa sudah kembali',
            'Siswa telah melapor kembali ke sekolah dari dispen.');
  end if;

  return r.id;
end;
$$;

grant execute on function public.return_dispen(uuid) to authenticated;
