import { ENVIRONMENT } from "@/config/environment";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Perbandingan konstan-waktu supaya tidak bisa ditebak byte demi byte. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifikasi header `X-Hub-Signature-256` dari Meta: HMAC-SHA256 atas RAW body
 * memakai App Secret. Wajib dipanggil sebelum body dipercaya — tanpa ini siapa
 * pun yang tahu URL webhook bisa menyuntik event palsu.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): { ok: true } | { ok: false; reason: string } {
  const secret = ENVIRONMENT.instagram.appSecret;
  if (!secret) return { ok: false, reason: "IG_APP_SECRET belum diset" };
  if (!signatureHeader?.startsWith("sha256=")) {
    return { ok: false, reason: "Header X-Hub-Signature-256 tidak ada" };
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  return safeEqual(expected, received)
    ? { ok: true }
    : { ok: false, reason: "Signature tidak cocok" };
}

/**
 * Autentikasi bot Hermes lewat `Authorization: Bearer <HERMES_API_KEY>`.
 * Endpoint ini di luar sesi Supabase, jadi key inilah satu-satunya gerbang.
 */
export function verifyHermesKey(
  request: Request,
): { ok: true } | { ok: false; status: number; error: string } {
  const key = ENVIRONMENT.hermes.apiKey;
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: "HERMES_API_KEY belum diset di server",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : request.headers.get("x-api-key") ?? "";

  if (!token || !safeEqual(key, token)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
