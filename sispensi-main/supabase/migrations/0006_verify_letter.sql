-- ============================================================================
-- SIPENSI — Migrasi 0006: Verifikasi Surat Izin publik (FR-7)
-- RPC verify_letter: dipanggil halaman /verify/<token> TANPA login (anon).
-- Mengembalikan data NON-sensitif (tanpa alasan izin) untuk cek keabsahan.
-- Prasyarat: 0001–0005.
-- ============================================================================

create or replace function public.verify_letter(p_token uuid)
returns table (
  valid boolean,
  student_name text,
  class_name text,
  izin_type public.izin_type,
  requested_at timestamptz,
  status public.request_status,
  issued_at timestamptz,
  decided_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (pr.status = 'approved') as valid,
    s.full_name  as student_name,
    c.name       as class_name,
    pr.izin_type,
    pr.requested_at,
    pr.status,
    dl.issued_at,
    pr.decided_at
  from public.digital_letters dl
  join public.permission_requests pr on pr.id = dl.request_id
  join public.profiles s on s.id = pr.student_id
  left join public.classes c on c.id = pr.class_id
  where dl.qr_token = p_token;
$$;

grant execute on function public.verify_letter(uuid) to anon, authenticated;
