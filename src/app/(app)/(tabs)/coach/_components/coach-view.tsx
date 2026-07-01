"use client";

import {
  COACH_MODELS,
  COACH_MODEL_LABELS,
  CoachModel,
  DEFAULT_COACH_MODEL,
  SUGGESTED_PROMPTS,
} from "@/constants/coach-constant";
import { CoachInit, saveTurn } from "@/features/coach/action";
import { handleCoachStreaming } from "@/features/coach/chat";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Conversation } from "@/types/ai";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

export default function CoachView({ init }: { init: CoachInit }) {
  const [messages, setMessages] = useState<Conversation[]>(init.messages);
  const [model, setModel] = useState<CoachModel>(DEFAULT_COACH_MODEL);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { listening, toggle: toggleVoice } = useVoiceInput({
    onInterim: setInput,
    onFinal: (text) => send(text),
  });

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
    setMessages([...history, { role: "model", parts: [{ text: "" }] }]);
    setInput("");
    setBusy(true);

    let answer = "";
    try {
      const stream = await handleCoachStreaming(history, { model, thinking });
      for await (const chunk of stream) {
        answer += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "model", parts: [{ text: answer }] };
          return next;
        });
      }
      if (!answer) {
        answer = "Maaf, aku belum bisa menjawab itu. Coba tanya hal lain seputar latihanmu ya.";
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "model", parts: [{ text: answer }] };
          return next;
        });
      }
      await saveTurn(init.conversationId, clean, answer);
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
                    <Markdown>{m.parts[0].text || "…"}</Markdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && messages[messages.length - 1]?.parts[0].text === "" && (
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
          aria-label={listening ? "Berhenti merekam" : "Tanya pakai suara"}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            flex: "none",
            background: listening ? "var(--lime)" : "var(--surface)",
            border: listening ? "none" : "1px solid var(--line2)",
            color: listening ? "#10130a" : "var(--dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: listening ? "pk-pulse 1.4s ease-in-out infinite" : "none",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
          </svg>
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={listening ? "Mendengarkan…" : "Tulis pertanyaanmu…"}
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
    </div>
  );
}
