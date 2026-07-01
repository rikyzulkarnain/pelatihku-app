"use server";

import { createAI } from "@/features/ai/instance";
import {
  ALL_QUOTA_EXHAUSTED_MESSAGE,
  COACH_MODELS,
} from "@/constants/coach-constant";
import { Content } from "@google/genai";

function isQuotaError(error: unknown): boolean {
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

const PROMPT = `Transkrip audio berikut menjadi teks Bahasa Indonesia PERSIS seperti yang diucapkan.
Aturan:
- Balas HANYA hasil transkripnya, tanpa tanda kutip, tanpa penjelasan, tanpa teks tambahan.
- Jangan menerjemahkan; pertahankan istilah asli (mis. nama makanan/gerakan).
- Jika audio tidak jelas atau kosong, balas string kosong.`;

/**
 * Transkripsi audio (base64 inlineData) menjadi teks Bahasa Indonesia lewat
 * Gemini — jauh lebih akurat untuk Bahasa Indonesia dibanding Web Speech API
 * bawaan browser. Dipakai fitur "bicara" di chat coach & nutrisi.
 */
export async function transcribeAudio(audio: {
  mimeType: string;
  base64: string;
}): Promise<{ text?: string; error?: string }> {
  const ai = createAI();
  const contents: Content[] = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: audio.mimeType, data: audio.base64 } },
        { text: PROMPT },
      ],
    },
  ];

  let lastError: unknown;
  for (const model of COACH_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { temperature: 0 },
      });
      const text = (response.text ?? "").trim();
      return { text };
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) continue;
      return {
        error:
          error instanceof Error ? error.message : "Gagal memproses suara.",
      };
    }
  }
  return {
    error: isQuotaError(lastError)
      ? ALL_QUOTA_EXHAUSTED_MESSAGE
      : "Gagal memproses suara.",
  };
}
