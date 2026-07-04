import { ENVIRONMENT } from "@/config/environment";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase dengan service-role key — MELEWATI RLS, sehingga bisa
 * membaca data semua pengguna. HANYA boleh dipakai dari kode server
 * (halaman/fungsi admin) dan hanya setelah lolos guard admin.
 */
export function createAdminClient() {
  if (!ENVIRONMENT.supabaseUrl || !ENVIRONMENT.supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diset — fitur admin butuh key ini.",
    );
  }
  return createSupabaseClient(
    ENVIRONMENT.supabaseUrl,
    ENVIRONMENT.supabaseServiceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
