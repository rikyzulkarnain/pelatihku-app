"use server";

import { CoachModel, DEFAULT_COACH_MODEL } from "@/constants/coach-constant";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatMessage } from "@/types/ai";
import { Content } from "@google/genai";
import { runLeadAgent } from "./lead";

// Jumlah pesan terakhir yang dikirim ke agent sebagai konteks percakapan.
const HISTORY_LIMIT = 20;

export type AgentMessageResult = {
  error?: string;
  text?: string;
  thought?: string;
  tools?: string[];
};

/**
 * Kirim satu pesan ke AI Coach (lead agent). Riwayat diambil dari DB — bukan
 * dari klien — lalu giliran user & jawaban agent disimpan setelah berhasil.
 */
export async function sendAgentMessage(input: {
  conversationId: string;
  text: string;
  model?: CoachModel;
  thinking?: boolean;
}): Promise<AgentMessageResult> {
  const text = input.text.trim();
  if (!text) return { error: "Pesannya masih kosong." };

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir. Silakan login ulang." };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", input.conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conversation) return { error: "Percakapan tidak ditemukan." };

  const { data: rows } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)
    .returns<Pick<ChatMessage, "role" | "content">[]>();

  const past: Content[] = (rows ?? [])
    .reverse()
    .map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  // Gemini mensyaratkan percakapan dibuka oleh giliran user.
  while (past[0]?.role === "model") past.shift();

  try {
    const reply = await runLeadAgent({
      history: [...past, { role: "user", parts: [{ text }] }],
      model: input.model ?? DEFAULT_COACH_MODEL,
      thinking: input.thinking ?? false,
    });

    // Dua insert terpisah (bukan satu batch) supaya created_at berbeda dan
    // urutan user → model tetap terjaga saat riwayat dimuat ulang.
    for (const [role, content] of [
      ["user", text],
      ["model", reply.text],
    ] as const) {
      await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role,
        content,
      });
    }

    return reply;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Terjadi kesalahan pada AI Coach.",
    };
  }
}
