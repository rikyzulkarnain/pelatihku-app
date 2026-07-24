"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "./guard";
import type { FeedbackStatus } from "./data";

const STATUSES: FeedbackStatus[] = ["baru", "diproses", "selesai"];

/**
 * Ubah status masukan pengguna (baru → diproses → selesai). Hanya admin yang
 * lolos guard; menulis lewat service-role client (bypass RLS).
 */
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { error: "Akses ditolak." };
  if (!STATUSES.includes(status)) return { error: "Status tidak valid." };

  const db = createAdminClient();
  const { error } = await db.from("feedback").update({ status }).eq("id", id);
  if (error) return { error: "Gagal memperbarui status." };

  revalidatePath("/admin/feedback");
  return {};
}
