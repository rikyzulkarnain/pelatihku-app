"use server";

import { createClient } from "@/lib/supabase/server";
import { ChatMessage, Conversation } from "@/types/ai";
import { CoachPersona } from "@/types/profile";

export type CoachInit = {
  conversationId: string;
  persona: CoachPersona;
  messages: Conversation[];
};

export async function getOrCreateConversation(): Promise<CoachInit | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_persona")
    .eq("id", user.id)
    .single();

  const defaultPersona = (profile?.coach_persona as CoachPersona) ?? "suportif";

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

export async function saveTurn(
  conversationId: string,
  userText: string,
  modelText: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
