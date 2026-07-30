import { verifyHermesKey } from "@/features/instagram/auth";
import { listPendingEvents, markEvents } from "@/features/instagram/events";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Antrian event untuk bot Hermes.
 *
 *   GET /api/instagram/events?limit=25&field=comments
 *   Authorization: Bearer <HERMES_API_KEY>
 *
 * Mengembalikan event berstatus 'baru', terlama dulu. Event TIDAK otomatis
 * ditandai terpakai — Hermes yang menandainya lewat POST setelah selesai, supaya
 * event tidak hilang kalau bot mati di tengah proses.
 */
export async function GET(request: NextRequest) {
  const auth = verifyHermesKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 25), 1), 100);
  const field = params.get("field");

  try {
    const events = await listPendingEvents({ limit, field });
    return NextResponse.json({ ok: true, count: events.length, events });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membaca event" },
      { status: 500 },
    );
  }
}

/**
 * Tandai event sudah ditangani.
 *
 *   POST /api/instagram/events
 *   Authorization: Bearer <HERMES_API_KEY>
 *   { "ids": ["uuid", ...], "status": "selesai", "note": "opsional" }
 */
export async function POST(request: NextRequest) {
  const auth = verifyHermesKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { ids?: unknown; status?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Field 'ids' wajib berisi minimal satu id" },
      { status: 400 },
    );
  }

  const allowed = ["diproses", "selesai", "diabaikan"] as const;
  const status = allowed.find((s) => s === body.status) ?? "selesai";
  const note = typeof body.note === "string" ? body.note : undefined;

  try {
    const updated = await markEvents(ids, status, note);
    return NextResponse.json({ ok: true, status, updated: updated.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal memperbarui event" },
      { status: 500 },
    );
  }
}
