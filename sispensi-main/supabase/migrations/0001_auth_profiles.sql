-- ============================================================================
-- SIPENSI — Migrasi 0001: Fondasi Autentikasi
-- Enum role + tabel profiles + trigger auto-provision + RLS.
--
-- Ini adalah kebutuhan MINIMUM agar autentikasi & role berfungsi.
-- Skema domain lengkap (classes, subjects, schedules, permission_requests,
-- approval_logs, digital_letters, notifications — §10 PRD) dibuat pada tahap
-- "Skema database" berikutnya.
--
-- Cara menjalankan: buka Supabase Dashboard > SQL Editor, tempel & Run.
-- (atau `supabase db push` bila memakai Supabase CLI)
-- ============================================================================

-- 1) Enum peran pengguna (§5 PRD) --------------------------------------------
create type public.user_role as enum (
  'siswa',
  'guru_mapel',
  'wali_kelas',
  'guru_bk',
  'admin'
);

-- 2) Tabel profiles (ekstensi dari auth.users) -------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       public.user_role not null default 'siswa',
  class_id   uuid,        -- FK ke public.classes (ditambahkan pada migrasi skema lengkap)
  nis        text unique, -- Nomor Induk Siswa (khusus siswa)
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil pengguna & role SIPENSI, ekstensi dari auth.users.';

create index profiles_role_idx on public.profiles (role);
create index profiles_class_id_idx on public.profiles (class_id);

-- 3) Jaga kolom updated_at ----------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 4) Auto-provision profil saat user baru dibuat di Auth ----------------------
--    Role & nama dapat dikirim lewat user_metadata saat pembuatan user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'siswa'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Helper role (SECURITY DEFINER agar tidak memicu rekursi RLS) -------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 6) Row Level Security -------------------------------------------------------
alter table public.profiles enable row level security;

-- Baca profil sendiri
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Admin baca semua profil
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- Update profil sendiri, TAPI role tidak boleh diubah sendiri
-- (role baru harus sama dengan role saat ini) untuk mencegah eskalasi hak akses.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

-- Admin: akses penuh (insert/update/delete termasuk mengubah role)
create policy "profiles_all_admin"
  on public.profiles for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
