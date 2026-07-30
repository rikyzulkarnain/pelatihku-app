import { ENVIRONMENT } from "@/config/environment";
import { verifyMetaSignature } from "@/features/instagram/auth";
import {
  parseWebhookPayload,
  pushToHermes,
  storeEvents,
} from "@/features/instagram/events";
import { NextRequest, NextResponse } from "next/server";

// Butuh node:crypto untuk verifikasi signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifikasi kepemilikan webhook. Meta memanggil ini sekali saat kamu menyimpan
 * URL Callback di dashboard dan mengharapkan `hub.challenge` dikembalikan
 * apa adanya sebagai text/plain.
 *
 *   GET /api/instagram/webhook?hub.mode=subscribe&hub.challenge=..&hub.verify_token=..
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const expected = ENVIRONMENT.instagram.webhookVerifyToken;
  if (!expected) {
    return NextResponse.json(
      { error: "IG_WEBHOOK_VERIFY_TOKEN belum diset di server" },
      { status: 503 },
    );
  }

  if (mode !== "subscribe" || token !== expected || !challenge) {
    return NextResponse.json({ error: "Verifikasi gagal" }, { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

/**
 * Terima event (komentar, mention, DM). Alurnya:
 * body mentah -> verifikasi HMAC -> parse -> simpan (idempoten) -> push opsional.
 *
 * Selalu balas 200 setelah signature valid. Meta akan mengirim ulang event kalau
 * dapat non-2xx, dan pengiriman ulang yang menumpuk bisa membuat langganan
 * webhook dinonaktifkan — jadi galat internal dilaporkan di body, bukan status.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = verifyMetaSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
  );

  if (!signature.ok) {
    return NextResponse.json({ error: signature.reason }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
  }

  const rows = parseWebhookPayload(parsed);
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, stored: 0, note: "Tidak ada event" });
  }

  try {
    const stored = await storeEvents(rows);
    const push = await pushToHermes(stored);
    return NextResponse.json({
      ok: true,
      received: rows.length,
      stored: stored.length,
      push,
    });
  } catch (e) {
    console.error("[ig-webhook] gagal menyimpan event", e);
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan event",
    });
  }
}
