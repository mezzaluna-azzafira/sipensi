-- ============================================================================
-- SIPENSI — Migrasi 0004: Supabase Storage
-- Bucket + policy untuk bukti pendukung (FR-2) & surat izin PDF (FR-6).
--
-- Konvensi path objek: "<user_id>/<namafile>" (folder pertama = pemilik).
-- Approver & verifikasi publik mengakses file lewat SIGNED URL yang dibuat
-- server (service role) setelah cek wewenang — jadi policy di sini cukup
-- membatasi akses langsung ke pemilik saja.
--
-- Prasyarat: 0003 sudah dijalankan (butuh public.is_admin()).
-- Cara jalan: SQL Editor > tempel > Run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Buckets (privat, batasi ukuran & tipe berkas)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bukti-izin', 'bukti-izin', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('surat-izin', 'surat-izin', false, 5242880,
    array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Policy pada storage.objects
-- ---------------------------------------------------------------------------

-- bukti-izin: pemilik boleh CRUD file di folder miliknya
drop policy if exists "bukti_insert_own" on storage.objects;
create policy "bukti_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bukti-izin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bukti_select_own" on storage.objects;
create policy "bukti_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bukti-izin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bukti_update_own" on storage.objects;
create policy "bukti_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'bukti-izin'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'bukti-izin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bukti_delete_own" on storage.objects;
create policy "bukti_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bukti-izin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- surat-izin: pemilik hanya boleh MEMBACA suratnya.
-- Penulisan surat dilakukan server (service role), bukan client.
drop policy if exists "surat_select_own" on storage.objects;
create policy "surat_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'surat-izin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin: akses penuh ke kedua bucket
drop policy if exists "storage_admin_all" on storage.objects;
create policy "storage_admin_all" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('bukti-izin', 'surat-izin') and public.is_admin()
  )
  with check (
    bucket_id in ('bukti-izin', 'surat-izin') and public.is_admin()
  );
