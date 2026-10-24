-- ============================================================================
-- SIPENSI — Migrasi 0002: Skema Domain Inti (§10 PRD)
-- Enum, tabel master & transaksional, relasi, index, trigger updated_at.
--
-- Struktur DATA saja. Logika alur (auto-detect jadwal, eskalasi timeout,
-- keputusan approval, penerbitan surat) dibuat pada fase fitur berikutnya
-- lewat function/RPC + Edge Function — agar asumsi §11 (durasi timeout &
-- fallback approver) tidak dikunci sebelum divalidasi dengan sekolah.
--
-- Prasyarat: migrasi 0001_auth_profiles.sql sudah dijalankan.
-- Cara jalan: Supabase Dashboard > SQL Editor > tempel > Run (sekali saja).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ENUM
-- ---------------------------------------------------------------------------
create type public.izin_type as enum (
  'keluar_sementara',
  'pulang',
  'sakit',
  'keperluan_keluarga',
  'dispensasi',
  'lainnya'
);

create type public.request_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);

create type public.approval_action as enum (
  'submitted',
  'approved',
  'rejected',
  'escalated',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- 2) MASTER: classes (kelas)
-- ---------------------------------------------------------------------------
create table public.classes (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,          -- mis. "XI RPL 1"
  grade_level         smallint check (grade_level between 10 and 13), -- tingkat
  major               text,                          -- jurusan, mis. "RPL"
  homeroom_teacher_id uuid references public.profiles (id) on delete set null, -- wali kelas
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.classes is 'Data kelas. homeroom_teacher_id = Wali Kelas (§5).';

create index classes_homeroom_idx on public.classes (homeroom_teacher_id);

-- Lengkapi FK profiles.class_id -> classes (disiapkan di migrasi 0001).
alter table public.profiles
  add constraint profiles_class_id_fkey
  foreign key (class_id) references public.classes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3) MASTER: subjects (mata pelajaran)
-- ---------------------------------------------------------------------------
create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text,
  created_at timestamptz not null default now()
);

comment on table public.subjects is 'Daftar mata pelajaran.';

-- ---------------------------------------------------------------------------
-- 4) MASTER: schedules (jadwal mengajar per kelas)
-- ---------------------------------------------------------------------------
create table public.schedules (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  teacher_id   uuid references public.profiles (id) on delete set null, -- guru mapel
  day_of_week  smallint not null check (day_of_week between 1 and 7),   -- ISO: 1=Senin .. 7=Minggu
  start_time   time not null,
  end_time     time not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_time > start_time)
);

comment on table public.schedules is
  'Jadwal mengajar. Dipakai Auto-Detect Schedule (FR-3) untuk menentukan Guru Mapel penanggung jawab (Lapis 1).';
comment on column public.schedules.day_of_week is 'ISO day of week: 1=Senin .. 7=Minggu';

create index schedules_lookup_idx
  on public.schedules (class_id, day_of_week, start_time, end_time);
create index schedules_teacher_idx on public.schedules (teacher_id);

-- ---------------------------------------------------------------------------
-- 5) KONFIGURASI: escalation_settings (durasi timeout per lapis — FR-5/FR-9)
-- ---------------------------------------------------------------------------
create table public.escalation_settings (
  layer           smallint primary key check (layer between 1 and 3),
  timeout_minutes integer not null check (timeout_minutes > 0),
  updated_at      timestamptz not null default now()
);

comment on table public.escalation_settings is
  'Durasi timeout eskalasi per lapis (menit). Nilai awal = placeholder §11, dapat diubah Admin.';

-- Nilai awal (placeholder — perlu disepakati dengan sekolah, §11)
insert into public.escalation_settings (layer, timeout_minutes) values
  (1, 20),
  (2, 20),
  (3, 30);

-- ---------------------------------------------------------------------------
-- 6) TRANSAKSI: permission_requests (pengajuan izin — FR-2)
-- ---------------------------------------------------------------------------
create table public.permission_requests (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.profiles (id) on delete cascade,
  class_id             uuid references public.classes (id) on delete set null, -- snapshot kelas siswa
  izin_type            public.izin_type not null,
  reason               text not null,
  evidence_url         text,          -- bukti pendukung (Supabase Storage), opsional
  requested_at         timestamptz not null default now(), -- waktu berlakunya izin
  status               public.request_status not null default 'pending',
  current_layer        smallint not null default 1 check (current_layer between 1 and 3),
  current_approver_id  uuid references public.profiles (id) on delete set null, -- null di Lapis 3 = siapa pun Guru BK
  matched_schedule_id  uuid references public.schedules (id) on delete set null, -- jadwal hasil auto-detect
  current_deadline     timestamptz,   -- batas waktu approver saat ini (untuk eskalasi)
  decided_at           timestamptz,
  decided_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.permission_requests is 'Pengajuan izin siswa beserta state alur persetujuan.';

create index permission_requests_student_idx   on public.permission_requests (student_id);
create index permission_requests_status_idx    on public.permission_requests (status);
create index permission_requests_approver_idx  on public.permission_requests (current_approver_id);
create index permission_requests_class_idx     on public.permission_requests (class_id);
-- Dipakai job eskalasi untuk memindai yang lewat batas waktu (FR-5)
create index permission_requests_due_idx
  on public.permission_requests (status, current_deadline);

-- ---------------------------------------------------------------------------
-- 7) TRANSAKSI: approval_logs (riwayat tiap lapis — audit, §8)
-- ---------------------------------------------------------------------------
create table public.approval_logs (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.permission_requests (id) on delete cascade,
  layer       smallint not null check (layer between 1 and 3),
  approver_id uuid references public.profiles (id) on delete set null, -- null = tindakan sistem (mis. timeout)
  action      public.approval_action not null,
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.approval_logs is 'Jejak audit approve/reject/eskalasi (immutable).';

create index approval_logs_request_idx  on public.approval_logs (request_id);
create index approval_logs_approver_idx on public.approval_logs (approver_id);

-- ---------------------------------------------------------------------------
-- 8) TRANSAKSI: digital_letters (surat izin terbit — FR-6/FR-7)
-- ---------------------------------------------------------------------------
create table public.digital_letters (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null unique references public.permission_requests (id) on delete cascade,
  letter_number text unique,     -- nomor surat (opsional)
  pdf_url       text,            -- path PDF di Supabase Storage (diisi app setelah generate)
  qr_token      uuid not null unique default gen_random_uuid(), -- token verifikasi publik (tak tertebak)
  issued_at     timestamptz not null default now()
);

comment on table public.digital_letters is 'Surat izin digital. qr_token dipakai halaman verifikasi publik (FR-7).';

create index digital_letters_qr_token_idx on public.digital_letters (qr_token);

-- ---------------------------------------------------------------------------
-- 9) TRANSAKSI: notifications (FR-8)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.permission_requests (id) on delete cascade,
  title      text,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Notifikasi in-app (dikirim realtime via Supabase Realtime).';

create index notifications_user_idx on public.notifications (user_id, is_read);

-- ---------------------------------------------------------------------------
-- 10) Trigger updated_at (memakai public.handle_updated_at dari migrasi 0001)
-- ---------------------------------------------------------------------------
create trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.handle_updated_at();

create trigger schedules_set_updated_at
  before update on public.schedules
  for each row execute function public.handle_updated_at();

create trigger permission_requests_set_updated_at
  before update on public.permission_requests
  for each row execute function public.handle_updated_at();

create trigger escalation_settings_set_updated_at
  before update on public.escalation_settings
  for each row execute function public.handle_updated_at();
