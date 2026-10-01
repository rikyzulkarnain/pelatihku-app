import {
  ALL_QUOTA_EXHAUSTED_MESSAGE,
  COACH_MODELS,
  CoachModel,
} from "@/constants/coach-constant";
import {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import { createAI } from "./instance";

// True kalau error berasal dari kuota/rate limit habis (429 / RESOURCE_EXHAUSTED),
// sehingga aman untuk dicoba ulang ke model free berikutnya.
export function isQuotaError(error: unknown): boolean {
  const err = error as {
    status?: number | string;
    code?: number;
    message?: string;
  };
  const message = (err?.message ?? "").toLowerCase();
  return (
    err?.status === 429 ||
    err?.status === "RESOURCE_EXHAUSTED" ||
    err?.code === 429 ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("429")
  );
}

// True kalau model sedang kelebihan beban (503 / UNAVAILABLE, "high demand").
// Sifatnya sementara dan per model, jadi model lain biasanya masih bisa dipakai.
function isOverloadedError(error: unknown): boolean {
  const err = error as { status?: number | string; message?: string };
  const message = (err?.message ?? "").toLowerCase();
  return (
    err?.status === 503 ||
    err?.status === "UNAVAILABLE" ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("high demand")
  );
}

/**
 * generateContent dengan fallback model: model pilihan pengguna dicoba dulu,
 * sisanya dipakai berurutan kalau kuota habis atau model sedang sibuk.
 * `build` menerima nama model supaya config yang bergantung model
 * (mis. thinkingConfig) bisa disesuaikan.
 */
export async function generateWithFallback(
  preferred: CoachModel,
  build: (model: CoachModel) => GenerateContentParameters,
): Promise<GenerateContentResponse> {
  const ai = createAI();
  const models = [preferred, ...COACH_MODELS.filter((m) => m !== preferred)];
  let lastError: unknown;

  for (const model of models) {
    try {
      return await ai.models.generateContent(build(model));
    } catch (error) {
      lastError = error;
      if (isQuotaError(error) || isOverloadedError(error)) continue;
      throw error;
    }
  }

  throw new Error(
    isQuotaError(lastError)
      ? ALL_QUOTA_EXHAUSTED_MESSAGE
      : "Semua model AI sedang sibuk. Coba lagi sebentar ya.",
  );
}
