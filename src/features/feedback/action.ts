"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type FeedbackType = "saran" | "bug" | "lainnya";

type SubmitInput = {
  type: FeedbackType;
  message: string;
  /** Halaman/konteks asal masukan (opsional), mis. "/program". */
  page?: string;
};

/**
 * Kirim masukan (saran / laporan bug) dari pengguna yang sedang login.
 * Divalidasi ringan di sini; batas panjang juga dipaksa oleh constraint DB.
 */
export async function submitFeedback(
  input: SubmitInput,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Kamu harus login untuk mengirim masukan." };

  const message = input.message.trim();
  if (message.length < 3) return { error: "Masukannya masih terlalu pendek." };
  if (message.length > 4000)
    return { error: "Masukannya terlalu panjang (maks 4000 karakter)." };

  const type: FeedbackType = ["saran", "bug", "lainnya"].includes(input.type)
    ? input.type
    : "saran";

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    type,
    message,
    page: input.page?.slice(0, 200) ?? null,
  });

  if (error) return { error: "Gagal mengirim masukan. Coba lagi ya." };
  return {};
}
