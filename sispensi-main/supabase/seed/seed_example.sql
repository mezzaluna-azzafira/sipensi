-- ============================================================================
-- SIPENSI — Contoh data master (OPSIONAL, untuk uji coba)
-- Aman diubah/dihapus. Jalankan setelah 0002 & 0003.
-- ============================================================================

insert into public.subjects (name, code) values
  ('Matematika',        'MTK'),
  ('Bahasa Indonesia',  'BIND'),
  ('Pemrograman Web',   'PWEB'),
  ('Basis Data',        'BDAT')
on conflict (name) do nothing;

insert into public.classes (name, grade_level, major) values
  ('XI RPL 1', 11, 'RPL'),
  ('XI RPL 2', 11, 'RPL')
on conflict (name) do nothing;

-- Setelah membuat akun guru & siswa (via Authentication), lengkapi relasi, mis:
--
--   -- Set Wali Kelas untuk sebuah kelas:
--   update public.classes set homeroom_teacher_id =
--     (select id from public.profiles where full_name = 'Nama Wali Kelas')
--   where name = 'XI RPL 1';
--
--   -- Tempatkan siswa ke kelas:
--   update public.profiles set class_id =
--     (select id from public.classes where name = 'XI RPL 1')
--   where id = (select id from auth.users where email = 'siswa@contoh.sch.id');
--
--   -- Tambah jadwal (Senin, jam ke-1 08:00-08:45, guru mapel tertentu):
--   insert into public.schedules (class_id, subject_id, teacher_id, day_of_week, start_time, end_time)
--   values (
--     (select id from public.classes  where name = 'XI RPL 1'),
--     (select id from public.subjects where code = 'PWEB'),
--     (select id from public.profiles where full_name = 'Nama Guru'),
--     1, '08:00', '08:45'
--   );
