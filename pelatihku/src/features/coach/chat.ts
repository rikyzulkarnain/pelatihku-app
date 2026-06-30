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
import { getCoachContext } from "./context";
import { buildCoachSystemInstruction } from "./prompt";

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
  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: conversation as Content[],
    config: {
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
    },
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
