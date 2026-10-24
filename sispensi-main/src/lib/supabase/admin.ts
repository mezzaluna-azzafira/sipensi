import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client dengan SERVICE ROLE — HANYA untuk kode server.
 * MEM-BYPASS RLS. Gunakan hanya setelah otorisasi dipastikan, mis. membuat
 * signed URL bukti untuk approver yang memang berhak melihat pengajuannya.
 * Jangan pernah diimpor ke Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
