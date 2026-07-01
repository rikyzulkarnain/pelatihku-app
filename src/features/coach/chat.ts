"use server";

import { findKnowledge } from "@/features/ai/embedding";
import { createAI } from "@/features/ai/instance";
import { Conversation } from "@/types/ai";
import { CoachPersona } from "@/types/profile";
import {
  Content,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import { COACH_MODELS } from "@/constants/coach-constant";
import { getCoachContext } from "./context";
import { buildCoachSystemInstruction } from "./prompt";

// True kalau error berasal dari kuota/rate limit habis (429 / RESOURCE_EXHAUSTED),
// sehingga aman untuk dicoba ulang ke model free berikutnya.
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

export async function* handleCoachStreaming(
  conversation: Conversation[],
  persona: CoachPersona,
) {
  const lastUser =
    conversation[conversation.length - 1]?.parts?.[0]?.text ?? "";

  const ctx = await getCoachContext();

  let knowledge: { title: string; content: string }[] = [];
  try {
    knowledge = await findKnowledge(lastUser, 0.3, 5);
  } catch {
    knowledge = [];
  }

  const systemInstruction = buildCoachSystemInstruction(ctx, persona, knowledge);

  const ai = createAI();
  const config = {
    systemInstruction,
    temperature: 0.6,
    topP: 0.9,
    maxOutputTokens: 1024,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  };

  let lastError: unknown;

  for (const model of COACH_MODELS) {
    let emitted = false;
    try {
      const response = await ai.models.generateContentStream({
        model,
        contents: conversation as Content[],
        config,
      });

      for await (const chunk of response) {
        if (chunk.text) {
          emitted = true;
          yield chunk.text;
        }
      }
      return;
    } catch (error) {
      lastError = error;
      // Hanya fallback ke model lain kalau kuota habis DAN belum ada teks
      // yang dikirim ke user (biar jawaban tidak terpotong/dobel).
      if (!emitted && isQuotaError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw (
    lastError ??
    new Error("Semua model Gemini free sedang kehabisan kuota. Coba lagi nanti.")
  );
}
