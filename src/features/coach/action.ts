"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ChatMessage, Conversation } from "@/types/ai";
import { CoachPersona } from "@/types/profile";

export type CoachInit = {
  conversationId: string;
  persona: CoachPersona;
  messages: Conversation[];
};

export async function getOrCreateConversation(): Promise<CoachInit | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_persona")
    .eq("id", user.id)
    .single();

  const defaultPersona = (profile?.coach_persona as CoachPersona) ?? "tegas";

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id, persona")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: created } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, persona: defaultPersona, title: "Coach" })
      .select("id, persona")
      .single();
    conversation = created;
  }

  if (!conversation) return null;

  const { data: rows } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<ChatMessage[]>();

  const messages: Conversation[] = (rows ?? []).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  return {
    conversationId: conversation.id,
    persona: conversation.persona as CoachPersona,
    messages,
  };
}

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
};

/** Daftar percakapan lama (yang sudah ada isinya) untuk dilihat kembali. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!convs?.length) return [];

  const ids = convs.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("conversation_id, role, content, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true })
    .returns<ChatMessage[]>();

  // Judul = pesan pertama dari user; percakapan tanpa isi disembunyikan.
  const firstUserMsg = new Map<string, string>();
  const withMessages = new Set<string>();
  for (const m of msgs ?? []) {
    withMessages.add(m.conversation_id);
    if (m.role === "user" && !firstUserMsg.has(m.conversation_id)) {
      firstUserMsg.set(m.conversation_id, m.content);
    }
  }

  return convs
    .filter((c) => withMessages.has(c.id))
    .map((c) => ({
      id: c.id,
      title: firstUserMsg.get(c.id)?.trim() || "Percakapan",
      createdAt: c.created_at as string,
    }));
}

/** Muat satu percakapan lama berdasarkan id (untuk dibuka kembali). */
export async function getConversation(
  conversationId: string,
): Promise<CoachInit | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, persona")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conversation) return null;

  const { data: rows } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<ChatMessage[]>();

  return {
    conversationId: conversation.id,
    persona: conversation.persona as CoachPersona,
    messages: (rows ?? []).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  };
}

/** Mulai percakapan baru (kosong) supaya topik tidak menumpuk di satu chat. */
export async function createConversation(): Promise<CoachInit | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_persona")
    .eq("id", user.id)
    .single();

  const persona = (profile?.coach_persona as CoachPersona) ?? "tegas";

  const { data: created } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, persona, title: "Coach" })
    .select("id, persona")
    .single();

  if (!created) return null;

  return {
    conversationId: created.id,
    persona: created.persona as CoachPersona,
    messages: [],
  };
}

export async function saveTurn(
  conversationId: string,
  userText: string,
  modelText: string,
): Promise<void> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from("chat_messages").insert([
    {
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: userText,
    },
    {
      conversation_id: conversationId,
      user_id: user.id,
      role: "model",
      content: modelText,
    },
  ]);
}

export async function setConversationPersona(
  conversationId: string,
  persona: CoachPersona,
): Promise<void> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;

  await Promise.all([
    supabase
      .from("conversations")
      .update({ persona })
      .eq("id", conversationId)
      .eq("user_id", user.id),
    supabase.from("profiles").update({ coach_persona: persona }).eq("id", user.id),
  ]);
}
