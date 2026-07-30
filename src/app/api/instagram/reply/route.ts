import { verifyHermesKey } from "@/features/instagram/auth";
import { markEvents } from "@/features/instagram/events";
import { replyToComment } from "@/features/instagram/reply";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kirim balasan komentar. Proxy ke Graph API supaya access token Instagram
 * tetap di server — Hermes cuma pegang HERMES_API_KEY.
 *
 *   POST /api/instagram/reply
 *   Authorization: Bearer <HERMES_API_KEY>
 *   { "comment_id": "17..", "message": "Halo!", "event_id": "uuid (opsional)" }
 *
 * Kalau `event_id` disertakan, event terkait sekaligus ditandai 'selesai'.
 */
export async function POST(request: NextRequest) {
  const auth = verifyHermesKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { comment_id?: unknown; message?: unknown; event_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
  }

  const commentId = typeof body.comment_id === "string" ? body.comment_id : "";
  const message =
    typeof body.message === "string" ? body.message.trim() : "";

  if (!commentId || !message) {
    return NextResponse.json(
      { error: "Field 'comment_id' dan 'message' wajib diisi" },
      { status: 400 },
    );
  }
  if (message.length > 2200) {
    return NextResponse.json(
      { error: "Balasan maksimal 2200 karakter" },
      { status: 400 },
    );
  }

  const result = await replyToComment({ commentId, message });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (typeof body.event_id === "string") {
    await markEvents([body.event_id], "selesai").catch((e) =>
      console.error("[ig-reply] gagal menandai event", e),
    );
  }

  return NextResponse.json({
    ok: true,
    reply_id: result.replyId,
    duplicate: result.duplicate ?? false,
  });
}
