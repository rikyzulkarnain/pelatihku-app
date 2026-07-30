import { ENVIRONMENT } from "@/config/environment";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReplyResult =
  | { ok: true; replyId: string | null; duplicate?: true }
  | { ok: false; status: number; error: string };

/**
 * Balas satu komentar Instagram lewat Graph API, dengan dua pengaman yang
 * diminta oleh batasan platform:
 *
 * 1. Satu comment_id hanya boleh dibalas sekali (unique di instagram_replies).
 *    Ini yang mencegah balasan berulang yang bisa ditandai spam.
 * 2. Jumlah balasan per jam dibatasi IG_REPLY_HOURLY_LIMIT (default 150) agar
 *    tetap di bawah limit keras Instagram 200 request/jam per akun.
 *
 * Access token disimpan di server; Hermes tidak perlu memegangnya.
 */
export async function replyToComment(input: {
  commentId: string;
  message: string;
}): Promise<ReplyResult> {
  const { accessToken, graphHost, graphVersion, replyHourlyLimit } =
    ENVIRONMENT.instagram;

  if (!accessToken) {
    return { ok: false, status: 503, error: "IG_ACCESS_TOKEN belum diset" };
  }

  const supabase = createAdminClient();

  // Sudah pernah dibalas? Balas 200 dengan penanda duplicate supaya bot yang
  // mengulang permintaan tidak menganggapnya error.
  const { data: existing } = await supabase
    .from("instagram_replies")
    .select("ig_reply_id")
    .eq("comment_id", input.commentId)
    .maybeSingle();

  if (existing) {
    return { ok: true, replyId: existing.ig_reply_id, duplicate: true };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("instagram_replies")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= replyHourlyLimit) {
    return {
      ok: false,
      status: 429,
      error: `Batas ${replyHourlyLimit} balasan/jam tercapai — coba lagi nanti.`,
    };
  }

  const url = `https://${graphHost}/${graphVersion}/${encodeURIComponent(
    input.commentId,
  )}/replies`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        message: input.message,
        access_token: accessToken,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "Gagal menghubungi Graph API",
    };
  }

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body.error?.message ?? `Graph API menolak (${res.status})`,
    };
  }

  // Dicatat setelah sukses saja — kalau gagal, komentar masih boleh dicoba lagi.
  await supabase.from("instagram_replies").insert({
    comment_id: input.commentId,
    message: input.message,
    ig_reply_id: body.id ?? null,
  });

  return { ok: true, replyId: body.id ?? null };
}
