import { ENVIRONMENT } from "@/config/environment";
import { createAdminClient } from "@/lib/supabase/admin";

export type InstagramEventRow = {
  event_key: string;
  object: string;
  field: string | null;
  ig_account_id: string | null;
  comment_id: string | null;
  parent_id: string | null;
  media_id: string | null;
  from_id: string | null;
  from_username: string | null;
  message: string | null;
  payload: unknown;
};

type Payload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
    messaging?: Array<Record<string, unknown>>;
  }>;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nested(value: Record<string, unknown>, key: string, inner: string) {
  const child = value[key];
  if (child && typeof child === "object") {
    return str((child as Record<string, unknown>)[inner]);
  }
  return null;
}

/**
 * Ubah payload webhook Meta menjadi baris-baris datar. Satu entry bisa membawa
 * beberapa `changes`, masing-masing jadi satu event.
 *
 * `event_key` dipakai untuk idempotensi: Meta mengirim ulang event kalau server
 * tidak balas 2xx, jadi kunci harus stabil untuk event yang sama. Untuk komentar
 * kuncinya comment id — itu unik dan tidak berubah antar percobaan kirim.
 */
export function parseWebhookPayload(raw: unknown): InstagramEventRow[] {
  const payload = (raw ?? {}) as Payload;
  const object = payload.object ?? "instagram";
  const rows: InstagramEventRow[] = [];

  payload.entry?.forEach((entry, entryIndex) => {
    const accountId = str(entry.id);

    entry.changes?.forEach((change, changeIndex) => {
      const value = change.value ?? {};
      const commentId = str(value.id);
      const fallbackKey = `${accountId ?? "unknown"}:${entry.time ?? 0}:${entryIndex}:${changeIndex}`;

      rows.push({
        event_key: commentId ? `${change.field ?? "change"}:${commentId}` : fallbackKey,
        object,
        field: str(change.field),
        ig_account_id: accountId,
        comment_id: commentId,
        parent_id: str(value.parent_id),
        media_id: nested(value, "media", "id"),
        from_id: nested(value, "from", "id"),
        from_username: nested(value, "from", "username"),
        message: str(value.text),
        payload: change,
      });
    });

    // Event DM datang di `messaging`, bukan `changes`. Disimpan mentah supaya
    // Hermes tetap menerimanya kalau nanti langganan field messages diaktifkan.
    entry.messaging?.forEach((event, messageIndex) => {
      const mid = nested(event, "message", "mid");
      rows.push({
        event_key: mid ?? `messaging:${accountId ?? "unknown"}:${entry.time ?? 0}:${messageIndex}`,
        object,
        field: "messaging",
        ig_account_id: accountId,
        comment_id: null,
        parent_id: null,
        media_id: null,
        from_id: nested(event, "sender", "id"),
        from_username: null,
        message: nested(event, "message", "text"),
        payload: event,
      });
    });
  });

  return rows;
}

/**
 * Simpan event. `ignoreDuplicates` membuat kiriman ulang dari Meta tidak
 * menghasilkan baris kedua, sehingga bot tidak pernah membalas dua kali.
 * Mengembalikan hanya baris yang benar-benar baru.
 */
export async function storeEvents(rows: InstagramEventRow[]) {
  if (rows.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("instagram_events")
    .upsert(rows, { onConflict: "event_key", ignoreDuplicates: true })
    .select("id, event_key, field, comment_id, from_username, message, received_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Push opsional ke Hermes. Gagal push tidak boleh menggagalkan webhook. */
export async function pushToHermes(events: unknown[]) {
  const url = ENVIRONMENT.hermes.pushUrl;
  if (!url || events.length === 0) return { pushed: false as const };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Hermes memverifikasi ini supaya tahu push benar dari server kita.
        ...(ENVIRONMENT.hermes.apiKey
          ? { authorization: `Bearer ${ENVIRONMENT.hermes.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(5000),
    });
    return { pushed: res.ok as boolean, status: res.status };
  } catch (e) {
    return {
      pushed: false as const,
      error: e instanceof Error ? e.message : "push gagal",
    };
  }
}

/** Antrian untuk Hermes: event yang belum diproses, terlama dulu. */
export async function listPendingEvents(options: {
  limit: number;
  field?: string | null;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("instagram_events")
    .select(
      "id, event_key, field, ig_account_id, comment_id, parent_id, media_id, from_id, from_username, message, payload, received_at",
    )
    .eq("status", "baru")
    .order("received_at", { ascending: true })
    .limit(options.limit);

  if (options.field) query = query.eq("field", options.field);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Hermes menandai event setelah selesai (atau sengaja dilewati). */
export async function markEvents(
  ids: string[],
  status: "diproses" | "selesai" | "diabaikan",
  note?: string,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("instagram_events")
    .update({
      status,
      note: note ?? null,
      processed_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select("id");

  if (error) throw new Error(error.message);
  return data ?? [];
}
