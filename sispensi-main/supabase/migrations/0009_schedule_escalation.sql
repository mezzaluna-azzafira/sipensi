-- ============================================================================
-- SIPENSI — Migrasi 0009: Jadwalkan Eskalasi Otomatis (FR-5)
--
-- Function public.escalate_overdue_requests() (migrasi 0005) hanya MENAIKKAN
-- pengajuan yang melewati batas waktu bila ada yang memanggilnya. Tanpa
-- penjadwal, pengajuan yang tidak direspons guru akan menggantung selamanya.
-- Migrasi ini menjadwalkannya dengan pg_cron (tersedia di Supabase) tiap menit.
--
-- Prasyarat: 0001–0008.
-- Cara jalan: SQL Editor > tempel > Run.
--
-- SEBELUM menjalankan, cek apakah sudah pernah dijadwalkan manual:
--   select jobid, jobname, schedule, command from cron.job;
-- Bila sudah ada job yang memanggil escalate_overdue_requests(), lewati
-- migrasi ini agar eskalasi tidak berjalan dobel.
--
-- Cek hasil setelah beberapa menit:
--   select status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 5;
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- Idempoten: hapus jadwal lama dengan nama sama (bila ada), lalu buat ulang.
do $$
begin
  perform cron.unschedule('sipensi-escalate-overdue');
exception when others then
  null; -- belum ada: abaikan
end;
$$;

select cron.schedule(
  'sipensi-escalate-overdue',
  '* * * * *',
  $$select public.escalate_overdue_requests();$$
);
