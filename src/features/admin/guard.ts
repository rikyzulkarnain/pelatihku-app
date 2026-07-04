import { ENVIRONMENT } from "@/config/environment";
import { getCurrentUser } from "@/lib/supabase/auth";

const adminEmails = ENVIRONMENT.adminEmails
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Kembalikan user yang sedang login BILA dia admin (emailnya terdaftar di
 * env ADMIN_EMAILS); selain itu null. Login-nya sendiri sudah dipaksa oleh
 * middleware — guard ini lapisan kedua khusus menu admin.
 */
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user?.email) return null;
  return adminEmails.includes(user.email.toLowerCase()) ? user : null;
}
