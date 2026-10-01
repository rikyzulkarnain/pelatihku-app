import { CoachPersona } from "./profile";

export type Conversation = {
  role: string;
  parts: { text: string; thought?: boolean }[];
  /** Tool yang dipilih lead agent untuk jawaban ini (hanya pesan baru, tidak disimpan). */
  tools?: string[];
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "model";
  content: string;
  created_at: string;
};

export type { CoachPersona };
