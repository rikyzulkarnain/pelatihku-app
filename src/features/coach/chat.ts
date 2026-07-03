"use server";

import { findKnowledge } from "@/features/ai/embedding";
import { createAI } from "@/features/ai/instance";
import { Conversation } from "@/types/ai";
import {
  Content,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import {
  ALL_QUOTA_EXHAUSTED_MESSAGE,
  COACH_MODELS,
  CoachModel,
  DEFAULT_COACH_MODEL,
  supportsThinking,
} from "@/constants/coach-constant";
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

type CoachStreamOptions = {
  model?: CoachModel;
  thinking?: boolean;
};

export async function* handleCoachStreaming(
  conversation: Conversation[],
  options: CoachStreamOptions = {},
) {
  const { model: preferred = DEFAULT_COACH_MODEL, thinking = false } = options;

  const lastUser =
    conversation[conversation.length - 1]?.parts?.[0]?.text ?? "";

  const ctx = await getCoachContext();

  let knowledge: { title: string; content: string }[] = [];
  try {
    knowledge = await findKnowledge(lastUser, 0.3, 5);
  } catch {
    knowledge = [];
  }

  // Coach bernada TEGAS: fokus pada suksesnya latihan pengguna,
  // menegur langsung kebiasaan yang merusak target.
  const systemInstruction = buildCoachSystemInstruction(
    ctx,
    "tegas",
    knowledge,
  );

  const ai = createAI();
  const baseConfig = {
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

  // Model pilihan pengguna dicoba lebih dulu, sisanya jadi fallback saat kuota habis.
  const models = [preferred, ...COACH_MODELS.filter((m) => m !== preferred)];

  for (const model of models) {
    // thinkingBudget: 0 mematikan thinking; hanya berlaku untuk model 2.5/3.
    // includeThoughts: true membuat alur berpikir ikut di-stream (parts.thought).
    const config = supportsThinking(model)
      ? {
          ...baseConfig,
          thinkingConfig: {
            includeThoughts: thinking,
            thinkingBudget: thinking ? -1 : 0,
          },
        }
      : baseConfig;

    let emitted = false;
    try {
      const response = await ai.models.generateContentStream({
        model,
        contents: conversation as Content[],
        config,
      });

      if (thinking) {
        // Pisahkan bagian "thought" (alur berpikir) dari jawaban akhir.
        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (!part.text) continue;
            emitted = true;
            yield part.thought ? `[thought]${part.text}` : part.text;
          }
        }
      } else {
        for await (const chunk of response) {
          if (chunk.text) {
            emitted = true;
            yield chunk.text;
          }
        }
      }
      return;
    } catch (error) {
      // Hanya fallback ke model lain kalau kuota habis DAN belum ada teks
      // yang dikirim ke user (biar jawaban tidak terpotong/dobel).
      if (!emitted && isQuotaError(error)) {
        continue;
      }
      throw error;
    }
  }

  // Sampai sini artinya semua model kena kuota (429) tanpa sempat menjawab.
  throw new Error(ALL_QUOTA_EXHAUSTED_MESSAGE);
}
