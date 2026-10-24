-- ============================================================================
-- SIPENSI — Migrasi 0005: Alur Persetujuan (FR-3, FR-4, FR-5)
--
-- Auto-detect approver Lapis 1 (dari jadwal, fallback Wali Kelas), keputusan
-- approve/reject, pembatalan siswa, dan eskalasi timeout. Semua transisi lewat
-- function SECURITY DEFINER agar tidak bisa dipalsukan dari client.
--
-- Keputusan §11 (2026-09-20): fallback = Wali Kelas; timeout L1/L2 = 20 menit
-- (dari escalation_settings, dapat diubah Admin). Lapis 3 = final (tak dieskalasi).
--
-- Prasyarat: 0001–0004. Zona waktu pencocokan jadwal: Asia/Jakarta (WIB).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) FR-3 — Auto-detect approver Lapis 1
-- ---------------------------------------------------------------------------
create or replace function public.detect_layer1_approver(
  p_class uuid,
  p_at timestamptz
)
returns table (approver_id uuid, schedule_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_local timestamp;
  v_dow smallint;
  v_time time;
begin
  if p_class is null then
    approver_id := null; schedule_id := null;
    return next; return;
  end if;

  -- Konversi ke waktu dinding WIB untuk mencocokkan jadwal.
  v_local := (p_at at time zone 'Asia/Jakarta');
  v_dow := extract(isodow from v_local)::smallint; -- 1=Senin .. 7=Minggu
  v_time := v_local::time;

  -- Jadwal aktif -> Guru Mapel.
  select s.teacher_id, s.id
    into approver_id, schedule_id
  from public.schedules s
  where s.class_id = p_class
    and s.day_of_week = v_dow
    and v_time >= s.start_time
    and v_time < s.end_time
    and s.teacher_id is not null
  order by s.start_time
  limit 1;

  if found then
    return next; return;
  end if;

  -- Fallback (§11): Wali Kelas.
  select c.homeroom_teacher_id, null::uuid
    into approver_id, schedule_id
  from public.classes c
  where c.id = p_class;

  return next;
end;
$$;

revoke all on function public.detect_layer1_approver(uuid, timestamptz) from public;

-- Trigger: setelah pengajuan dibuat, tetapkan approver Lapis 1 + deadline + log.
create or replace function public.assign_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_approver uuid;
  v_schedule uuid;
  v_timeout integer;
begin
  select approver_id, schedule_id
    into v_approver, v_schedule
  from public.detect_layer1_approver(new.class_id, new.created_at);

  select timeout_minutes into v_timeout
  from public.escalation_settings where layer = 1;

  update public.permission_requests
    set current_approver_id = v_approver,
        matched_schedule_id = v_schedule,
        current_deadline = new.created_at + make_interval(mins => coalesce(v_timeout, 20))
  where id = new.id;

  insert into public.approval_logs (request_id, layer, approver_id, action, note)
  values (new.id, 1, null, 'submitted', 'Pengajuan dibuat oleh siswa');

  if v_approver is not null then
    insert into public.notifications (user_id, request_id, title, message)
    values (v_approver, new.id, 'Pengajuan izin baru',
            'Ada pengajuan izin siswa menunggu persetujuan Anda (Lapis 1).');
  end if;

  return null;
end;
$$;

create trigger permission_requests_assign_after_insert
  after insert on public.permission_requests
  for each row execute function public.assign_after_insert();

-- ---------------------------------------------------------------------------
-- 2) FR-4 — Keputusan (approve / reject) oleh approver
-- ---------------------------------------------------------------------------
create or replace function public.decide_request(
  p_request uuid,
  p_action public.approval_action,
  p_note text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.permission_requests;
  v_allowed boolean;
begin
  if p_action not in ('approved', 'rejected') then
    raise exception 'Aksi keputusan tidak valid: %', p_action;
  end if;

  select * into r from public.permission_requests where id = p_request for update;
  if not found then
    raise exception 'Pengajuan tidak ditemukan';
  end if;
  if r.status <> 'pending' then
    raise exception 'Pengajuan sudah diputuskan sebelumnya';
  end if;

  v_allowed := (r.current_approver_id = auth.uid())
            or (r.current_layer = 3 and public.is_guru_bk())
            or public.is_admin();
  if not v_allowed then
    raise exception 'Anda tidak berwenang memutuskan pengajuan ini';
  end if;

  if p_action = 'rejected' and (p_note is null or length(btrim(p_note)) = 0) then
    raise exception 'Penolakan wajib menyertakan alasan';
  end if;

  update public.permission_requests
    set status = p_action::text::public.request_status,
        decided_at = now(),
        decided_by = auth.uid(),
        current_deadline = null,
        updated_at = now()
  where id = r.id;

  insert into public.approval_logs (request_id, layer, approver_id, action, note)
  values (r.id, r.current_layer, auth.uid(), p_action, p_note);

  insert into public.notifications (user_id, request_id, title, message)
  values (
    r.student_id, r.id,
    case when p_action = 'approved' then 'Izin disetujui' else 'Izin ditolak' end,
    case when p_action = 'approved'
      then 'Pengajuan izin Anda telah disetujui.'
      else 'Pengajuan izin Anda ditolak' || coalesce(': ' || p_note, '.')
    end
  );

  -- Terbitkan baris surat (PDF di-generate app pada FR-6).
  if p_action = 'approved' then
    insert into public.digital_letters (request_id)
    values (r.id)
    on conflict (request_id) do nothing;
  end if;

  return r.id;
end;
$$;

grant execute on function public.decide_request(uuid, public.approval_action, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Pembatalan oleh siswa
-- ---------------------------------------------------------------------------
create or replace function public.cancel_request(p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.permission_requests;
begin
  select * into r from public.permission_requests where id = p_request for update;
  if not found then
    raise exception 'Pengajuan tidak ditemukan';
  end if;
  if r.student_id <> auth.uid() and not public.is_admin() then
    raise exception 'Anda tidak berwenang membatalkan pengajuan ini';
  end if;
  if r.status <> 'pending' then
    raise exception 'Hanya pengajuan berstatus menunggu yang bisa dibatalkan';
  end if;

  update public.permission_requests
    set status = 'cancelled', current_deadline = null, updated_at = now()
  where id = r.id;

  insert into public.approval_logs (request_id, layer, approver_id, action, note)
  values (r.id, r.current_layer, auth.uid(), 'cancelled', 'Dibatalkan oleh siswa');

  return r.id;
end;
$$;

grant execute on function public.cancel_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) FR-5 — Eskalasi otomatis (dipanggil Cron / Edge Function)
-- ---------------------------------------------------------------------------
create or replace function public.escalate_overdue_requests()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r public.permission_requests;
  v_count integer := 0;
  v_next_layer smallint;
  v_next_approver uuid;
  v_timeout integer;
begin
  for r in
    select * from public.permission_requests
    where status = 'pending'
      and current_layer < 3
      and current_deadline is not null
      and current_deadline < now()
    for update skip locked
  loop
    v_next_layer := (r.current_layer + 1)::smallint;

    if v_next_layer = 2 then
      select c.homeroom_teacher_id into v_next_approver
      from public.classes c where c.id = r.class_id;
    else
      v_next_approver := null; -- Lapis 3: siapa pun Guru BK
    end if;

    select timeout_minutes into v_timeout
    from public.escalation_settings where layer = v_next_layer;

    update public.permission_requests
      set current_layer = v_next_layer,
          current_approver_id = v_next_approver,
          matched_schedule_id = null,
          current_deadline = now() + make_interval(mins => coalesce(v_timeout, 20)),
          updated_at = now()
    where id = r.id;

    insert into public.approval_logs (request_id, layer, approver_id, action, note)
    values (r.id, r.current_layer, null, 'escalated',
            format('Timeout Lapis %s — eskalasi otomatis ke Lapis %s',
                   r.current_layer, v_next_layer));

    if v_next_approver is not null then
      insert into public.notifications (user_id, request_id, title, message)
      values (v_next_approver, r.id, 'Eskalasi pengajuan izin',
              format('Pengajuan izin dieskalasi ke Anda (Lapis %s).', v_next_layer));
    else
      insert into public.notifications (user_id, request_id, title, message)
      select p.id, r.id, 'Eskalasi pengajuan izin',
             'Pengajuan izin dieskalasi ke Guru BK (Lapis 3).'
      from public.profiles p where p.role = 'guru_bk';
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Hanya boleh dijalankan server/cron (service_role), bukan client.
revoke all on function public.escalate_overdue_requests() from public;
grant execute on function public.escalate_overdue_requests() to service_role;

-- ---------------------------------------------------------------------------
-- 5) RLS tambahan: approver boleh membaca profil siswa yang ia proses
-- ---------------------------------------------------------------------------
create or replace function public.can_view_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_profile = auth.uid()
      or public.is_admin()
      or public.is_guru_bk()
      or public.is_wali_kelas_of_student(p_profile)
      or exists (
        select 1 from public.permission_requests pr
        where pr.student_id = p_profile
          and pr.current_approver_id = auth.uid()
      );
$$;

create policy "profiles_select_related"
  on public.profiles for select to authenticated
  using (public.can_view_profile(id));
