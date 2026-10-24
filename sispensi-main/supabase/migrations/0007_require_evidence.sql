-- ============================================================================
-- SIPENSI — Migrasi 0007: Bukti pendukung WAJIB pada pengajuan izin
--
-- Mencegah izin fiktif (siswa berbohong saat izin keluar). Selain divalidasi
-- di server action, syarat ini ditegakkan di level DB lewat policy RLS insert
-- agar tidak bisa dilewati via panggilan REST langsung (PostgREST).
--
-- Prasyarat: 0003 (policy pr_insert_own_student sudah ada).
-- Cara jalan: SQL Editor > tempel > Run.
-- ============================================================================

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
    -- Bukti WAJIB: tidak boleh null/kosong.
    and evidence_url is not null
    and length(btrim(evidence_url)) > 0
  );
