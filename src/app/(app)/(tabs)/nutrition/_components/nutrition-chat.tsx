"use client";

import { estimateAndLogMeal, MealItem, MealResult } from "@/features/nutrition/estimate";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useEffect, useRef, useState } from "react";

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  items?: MealItem[];
};

export default function NutritionChat({
  onClose,
  onLogged,
}: {
  onClose: () => void;
  onLogged: (res: MealResult) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Ceritakan apa yang kamu makan, aku hitung protein, karbo & lemaknya otomatis. Contoh: “nasi, ayam 1 potong, sayur bayam, dan tempe”. 🎤 atau ketik ya.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { listening, toggle: toggleVoice } = useVoiceInput({
    onInterim: setInput,
    onFinal: (text) => send(text),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: clean }]);
    setBusy(true);
    try {
      const res = await estimateAndLogMeal({ text: clean });
      if (res.error) {
        setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${res.error}` }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: res.reply ?? "Tercatat ✅", items: res.items },
        ]);
        if (res.items?.length) onLogged(res);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 90,
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
          height: "82%",
          display: "flex",
          flexDirection: "column",
          background: "var(--sheet)",
          borderRadius: "28px 28px 0 0",
          borderTop: "1px solid rgba(201,251,60,.18)",
          animation: "pk-up .3s both",
        }}
      >
        <div style={{ width: 42, height: 5, borderRadius: 5, background: "var(--raised2)", margin: "8px auto 4px" }} />

        {/* header */}
        <div style={{ padding: "6px 22px 12px", borderBottom: "1px solid var(--line2)", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "linear-gradient(150deg,#cdf93f,#9fe119)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            🍚
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: "800 16px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
              Catat makanan
            </div>
            <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--acc)" }}>
              ● chat atau suara — makro dihitung otomatis
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line2)", color: "var(--dim)", fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* messages */}
        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "84%",
                    padding: "11px 14px",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isUser ? "var(--lime)" : "var(--surface)",
                    color: isUser ? "#10130a" : "var(--ink2)",
                    border: isUser ? "none" : "1px solid var(--line2)",
                    font: "500 14px/1.5 var(--font-jakarta), sans-serif",
                  }}
                >
                  <div>{m.text}</div>
                  {m.items && m.items.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {m.items.map((it, j) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: "var(--raised)",
                          }}
                        >
                          <div>
                            <div style={{ font: "700 12.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                              {it.name}
                            </div>
                            <div style={{ font: "500 11px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                              {it.portion} · {Math.round(it.calories)} kkal
                            </div>
                          </div>
                          <div style={{ font: "600 11px var(--font-jakarta), sans-serif", color: "var(--dim)", textAlign: "right", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--acc)", fontWeight: 800 }}>{it.protein_g}p</span> · {it.carb_g}k · {it.fat_g}l
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {busy && (
            <div style={{ alignSelf: "flex-start", display: "flex", gap: 5, padding: "14px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--surface)", border: "1px solid var(--line2)" }}>
              {[0, 0.2, 0.4].map((d) => (
                <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)", animation: `pk-dot 1.2s ${d}s infinite` }} />
              ))}
            </div>
          )}
        </div>

        {/* input */}
        <div style={{ padding: "10px 16px 18px", display: "flex", gap: 9, alignItems: "flex-end" }}>
          <button
            onClick={toggleVoice}
            aria-label={listening ? "Berhenti merekam" : "Rekam suara"}
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
            placeholder={listening ? "Mendengarkan…" : "Tulis atau ucapkan makananmu…"}
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
    </div>
  );
}
