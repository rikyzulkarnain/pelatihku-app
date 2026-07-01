"use client";

import {
  COACH_MODELS,
  COACH_MODEL_LABELS,
  CoachModel,
  DEFAULT_COACH_MODEL,
  SUGGESTED_PROMPTS,
} from "@/constants/coach-constant";
import { transcribeAudio } from "@/features/ai/transcribe";
import {
  CoachInit,
  ConversationSummary,
  createConversation,
  getConversation,
  listConversations,
  saveTurn,
} from "@/features/coach/action";
import { handleCoachStreaming } from "@/features/coach/chat";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Conversation } from "@/types/ai";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";

export default function CoachView({ init }: { init: CoachInit }) {
  const [messages, setMessages] = useState<Conversation[]>(init.messages);
  const [conversationId, setConversationId] = useState(init.conversationId);
  const [model, setModel] = useState<CoachModel>(DEFAULT_COACH_MODEL);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { recording, toggle: toggleVoice } = useAudioRecorder({
    onRecorded: async (audio) => {
      setTranscribing(true);
      try {
        const t = await transcribeAudio(audio);
        if (t.error) {
          toast.error(t.error);
          return;
        }
        const text = t.text?.trim();
        if (!text) {
          toast.error("Suaranya kurang jelas. Coba lagi ya.");
          return;
        }
        send(text);
      } finally {
        setTranscribing(false);
      }
    },
  });

  async function newChat() {
    if (busy || transcribing) return;
    const res = await createConversation();
    if (!res) {
      toast.error("Gagal memulai chat baru.");
      return;
    }
    setConversationId(res.conversationId);
    setMessages([]);
    setInput("");
  }

  async function openHistory() {
    if (busy || transcribing) return;
    setHistoryOpen(true);
    setConversations(null); // tampilkan loading
    setConversations(await listConversations());
  }

  async function selectConversation(id: string) {
    if (id === conversationId) {
      setHistoryOpen(false);
      return;
    }
    const res = await getConversation(id);
    if (!res) {
      toast.error("Gagal memuat percakapan.");
      return;
    }
    setConversationId(res.conversationId);
    setMessages(res.messages);
    setInput("");
    setHistoryOpen(false);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;

    const userMsg: Conversation = { role: "user", parts: [{ text: clean }] };
    const history = [...messages, userMsg];
    const emptyModel: Conversation = {
      role: "model",
      parts: thinking ? [{ thought: true, text: "" }, { text: "" }] : [{ text: "" }],
    };
    setMessages([...history, emptyModel]);
    setInput("");
    setBusy(true);

    let answer = "";
    let thought = "";
    const render = () =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "model",
          parts: thinking
            ? [{ thought: true, text: thought }, { text: answer }]
            : [{ text: answer }],
        };
        return next;
      });

    try {
      const stream = await handleCoachStreaming(history, { model, thinking });
      for await (const chunk of stream) {
        if (chunk.startsWith("[thought]")) {
          thought += chunk.slice("[thought]".length);
        } else {
          answer += chunk;
        }
        render();
      }
      if (!answer) {
        answer = "Maaf, aku belum bisa menjawab itu. Coba tanya hal lain seputar latihanmu ya.";
        render();
      }
      await saveTurn(conversationId, clean, answer);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Terjadi kesalahan pada AI Coach.";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "model",
          parts: [{ text: `⚠️ ${msg}` }],
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      {/* header */}
      <div style={{ padding: "8px 20px 12px", borderBottom: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "linear-gradient(150deg,#cdf93f,#9fe119)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🏋️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: "800 17px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
              AI Coach
            </div>
            <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--acc)" }}>
              ● tahu profil & program kamu
            </div>
          </div>
          {/* lihat percakapan sebelumnya */}
          <button
            onClick={openHistory}
            disabled={busy || transcribing}
            aria-label="Riwayat chat"
            title="Riwayat chat"
            style={{
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              flex: "none",
              background: "var(--surface)",
              border: "1px solid var(--line2)",
              color: "var(--ink2)",
              opacity: busy || transcribing ? 0.5 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>
          {/* mulai percakapan baru biar topik tidak menumpuk */}
          <button
            onClick={newChat}
            disabled={busy || transcribing || messages.length === 0}
            aria-label="Chat baru"
            title="Chat baru"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 12,
              flex: "none",
              background: "var(--surface)",
              border: "1px solid var(--line2)",
              color: "var(--ink2)",
              font: "800 12.5px var(--font-archivo), sans-serif",
              opacity: busy || transcribing || messages.length === 0 ? 0.5 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Baru
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          {/* pilih model Gemini free (fallback otomatis kalau kuota habis) */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as CoachModel)}
            aria-label="Model Gemini"
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 12,
              font: "700 12px var(--font-archivo), sans-serif",
              background: "var(--surface)",
              color: "var(--dim)",
              border: "1px solid var(--line2)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {COACH_MODELS.map((m) => (
              <option key={m} value={m}>
                {COACH_MODEL_LABELS[m]}
              </option>
            ))}
          </select>

          {/* toggle thinking — ikon saja */}
          <button
            onClick={() => setThinking((t) => !t)}
            aria-pressed={thinking}
            aria-label={thinking ? "Thinking aktif" : "Thinking nonaktif"}
            title={thinking ? "Thinking: aktif" : "Thinking: nonaktif"}
            style={{
              width: 40,
              height: 40,
              flex: "none",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: thinking ? "var(--lime)" : "var(--surface)",
              color: thinking ? "#10130a" : "var(--dim)",
              border: thinking ? "none" : "1px solid var(--line2)",
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.7.8 3.2 2 4.2V15a2 2 0 0 0 2 2h.5M9.5 2A5.5 5.5 0 0 1 15 7.5c0 1.7-.8 3.2-2 4.2V15a2 2 0 0 1-2 2h-.5M9 20.5h4M10 22h2" />
              <path d="M9 17v3.5M13 17v3.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", padding: "18px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}
        className="no-scrollbar"
      >
        {messages.length === 0 && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ font: "800 18px var(--font-archivo), sans-serif", color: "var(--ink)", marginBottom: 6 }}>
              Halo! Aku coach-mu 👋
            </div>
            <p style={{ font: "500 14px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", maxWidth: 260, margin: "0 auto" }}>
              Tanya soal teknik, ganti gerakan, nutrisi, atau sekadar minta semangat.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          // Lewati gelembung model yang masih kosong — indikator "mengetik"
          // (titik animasi) di bawah yang menanganinya, biar tidak dobel.
          if (!isUser && !m.parts.some((p) => p.text)) return null;
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "82%",
                  padding: "11px 14px",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isUser ? "var(--lime)" : "var(--surface)",
                  color: isUser ? "#10130a" : "var(--ink2)",
                  border: isUser ? "none" : "1px solid var(--line2)",
                  font: "500 14px var(--font-jakarta), sans-serif",
                }}
              >
                {isUser ? (
                  m.parts[0].text
                ) : (
                  <div className="pk-md">
                    {m.parts.map((part, pi) => {
                      if (!part.text) return null;
                      if (part.thought) return <ThoughtBlock key={pi} text={part.text} />;
                      return <Markdown key={pi}>{part.text}</Markdown>;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {(transcribing ||
          (busy && !messages[messages.length - 1]?.parts.some((p) => p.text))) && (
          <div style={{ alignSelf: "flex-start", display: "flex", gap: 5, padding: "14px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--surface)", border: "1px solid var(--line2)" }}>
            {[0, 0.2, 0.4].map((d) => (
              <span
                key={d}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--lime)",
                  animation: `pk-dot 1.2s ${d}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* suggested prompts */}
      {messages.length < 2 && (
        <div style={{ padding: "8px 16px 4px", display: "flex", gap: 8, overflowX: "auto" }} className="no-scrollbar">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              style={{
                flex: "none",
                padding: "9px 13px",
                borderRadius: 12,
                whiteSpace: "nowrap",
                background: "var(--surface)",
                border: "1px solid var(--line2)",
                color: "var(--dim)",
                font: "600 12.5px var(--font-jakarta), sans-serif",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <div style={{ padding: "10px 16px 14px", display: "flex", gap: 9, alignItems: "flex-end" }}>
        <button
          onClick={toggleVoice}
          disabled={busy || transcribing}
          aria-label={recording ? "Berhenti & kirim" : "Tanya pakai suara"}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            flex: "none",
            background: recording ? "#ff3b30" : "var(--surface)",
            border: recording ? "none" : "1px solid var(--line2)",
            color: recording ? "#fff" : "var(--dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: (busy || transcribing) && !recording ? 0.5 : 1,
            animation: recording ? "pk-pulse 1.4s ease-in-out infinite" : "none",
          }}
        >
          {recording ? (
            <span style={{ width: 16, height: 16, borderRadius: 4, background: "#fff", display: "block" }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
            </svg>
          )}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={
            recording
              ? "Merekam… tekan ⏹ untuk kirim"
              : transcribing
                ? "Menyalin suara…"
                : "Tulis pertanyaanmu…"
          }
          disabled={recording}
          style={{
            flex: 1,
            padding: "13px 16px",
            borderRadius: 16,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            font: "500 14px var(--font-jakarta), sans-serif",
            outline: "none",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          aria-label="Kirim"
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            flex: "none",
            background: "var(--lime)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: busy || !input.trim() ? 0.55 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10130a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      {historyOpen && (
        <HistoryPanel
          conversations={conversations}
          activeId={conversationId}
          onSelect={selectConversation}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

function HistoryPanel({
  conversations,
  activeId,
  onSelect,
  onClose,
}: {
  conversations: ConversationSummary[] | null;
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 95,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "72%",
          display: "flex",
          flexDirection: "column",
          background: "var(--sheet)",
          borderRadius: "28px 28px 0 0",
          borderTop: "1px solid rgba(201,251,60,.18)",
          animation: "pk-up .3s both",
        }}
      >
        <div style={{ width: 42, height: 5, borderRadius: 5, background: "var(--raised2)", margin: "8px auto 4px" }} />
        <div style={{ padding: "6px 22px 12px", borderBottom: "1px solid var(--line2)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, font: "800 16px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Riwayat percakapan
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line2)", color: "var(--dim)", fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        <div className="no-scrollbar" style={{ overflowY: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {conversations === null ? (
            <div style={{ padding: "24px 0", textAlign: "center", font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
              Memuat…
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
              Belum ada percakapan tersimpan.
            </div>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 14,
                    padding: "12px 14px",
                    background: active ? "rgba(201,251,60,.12)" : "var(--surface)",
                    border: active ? "1px solid var(--acc)" : "1px solid var(--line2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <span
                    style={{
                      font: "700 14px var(--font-archivo), sans-serif",
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.title}
                  </span>
                  <span style={{ font: "500 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                    {format(new Date(c.createdAt), "d MMM yyyy · HH:mm")}
                    {active ? " · sedang dibuka" : ""}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ThoughtBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 10,
          background: "var(--raised)",
          border: "1px solid var(--line2)",
          color: "var(--dim)",
          font: "700 11.5px var(--font-archivo), sans-serif",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.7.8 3.2 2 4.2V15a2 2 0 0 0 2 2h.5M9.5 2A5.5 5.5 0 0 1 15 7.5c0 1.7-.8 3.2-2 4.2V15a2 2 0 0 1-2 2h-.5M9 20.5h4M10 22h2" />
        </svg>
        {open ? "Sembunyikan alur berpikir" : "Tampilkan alur berpikir"}
        <span style={{ fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          className="pk-md"
          style={{
            marginTop: 8,
            paddingLeft: 12,
            borderLeft: "2px solid var(--line2)",
            color: "var(--dim)",
            font: "400 12.5px/1.6 var(--font-jakarta), sans-serif",
          }}
        >
          <Markdown>{text}</Markdown>
        </div>
      )}
    </div>
  );
}
