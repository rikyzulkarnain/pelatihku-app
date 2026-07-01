"use client";

import {
  COACH_MODELS,
  COACH_MODEL_LABELS,
  CoachModel,
  DEFAULT_COACH_MODEL,
} from "@/constants/coach-constant";
import { nutritionChat, NutritionChatResult } from "@/features/nutrition/chat";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  totals?: NutritionChatResult["totals"];
};

const VOICE_PLACEHOLDER = "🎤 …";

// Ganti gelembung placeholder suara ("🎤 …") dengan transkrip aslinya.
function replaceVoicePlaceholder(msgs: ChatMsg[], replacement?: string): ChatMsg[] {
  const next = [...msgs];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i].role === "user" && next[i].text === VOICE_PLACEHOLDER) {
      next[i] = {
        ...next[i],
        text: replacement?.trim() ? replacement.trim() : "🎤 Pesan suara",
      };
      break;
    }
  }
  return next;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NutritionChat({
  onClose,
  onResult,
}: {
  onClose: () => void;
  onResult: (res: NutritionChatResult) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Ceritakan makananmu — ketik, tekan 🎤 untuk bicara (teksnya muncul otomatis), atau 📷 untuk foto makanan / struk. Protein, karbo & lemak dihitung otomatis. Bisa juga bilang “hapus telur dadar” atau “ubah nasi jadi 2 centong”.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<CoachModel>(DEFAULT_COACH_MODEL);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const { recording, toggle: toggleVoice } = useAudioRecorder({
    onRecorded: (audio) => run({ audio }, VOICE_PLACEHOLDER),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function run(
    payload: Omit<Parameters<typeof nutritionChat>[0], "model">,
    userLabel: string,
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: userLabel }]);
    try {
      const res = await nutritionChat({ ...payload, model });
      if (res.error) {
        setMessages((m) => {
          const next = replaceVoicePlaceholder(m);
          next.push({ role: "assistant", text: `⚠️ ${res.error}` });
          return next;
        });
      } else {
        setMessages((m) => {
          const next = replaceVoicePlaceholder(m, res.transcript);
          next.push({
            role: "assistant",
            text: res.reply ?? "Tercatat ✅",
            totals: res.changed ? res.totals : undefined,
          });
          return next;
        });
        onResult(res);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      setMessages((m) => {
        const next = replaceVoicePlaceholder(m);
        next.push({ role: "assistant", text: `⚠️ ${msg}` });
        return next;
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function sendText(text?: string) {
    const clean = (text ?? input).trim();
    if (!clean || busyRef.current) return;
    setInput("");
    run({ text: clean }, clean);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // izinkan pilih file yang sama lagi
    if (!file || busy) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar ya.");
      return;
    }
    const caption = input.trim();
    setInput("");
    try {
      const base64 = await fileToBase64(file);
      run(
        { image: { mimeType: file.type, base64 }, text: caption || undefined },
        caption ? `📷 ${caption}` : "📷 Foto makanan",
      );
    } catch {
      toast.error("Gagal membaca foto.");
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
        <div style={{ padding: "6px 22px 12px", borderBottom: "1px solid var(--line2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                ● chat · suara · foto — makro dihitung otomatis
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
          {/* pilih model Gemini free (fallback otomatis kalau kuota habis) */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as CoachModel)}
            aria-label="Model Gemini"
            style={{
              width: "100%",
              marginTop: 10,
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
                  {m.totals && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        gap: 6,
                      }}
                    >
                      <TotalChip label="kkal" value={Math.round(m.totals.calories)} color="var(--acc)" />
                      <TotalChip label="protein" value={`${m.totals.protein_g}g`} color="var(--acc)" />
                      <TotalChip label="karbo" value={`${m.totals.carb_g}g`} color="#7cc4ff" />
                      <TotalChip label="lemak" value={`${m.totals.fat_g}g`} color="#ff9a5c" />
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
        <div style={{ padding: "10px 16px 18px", display: "flex", gap: 8, alignItems: "flex-end" }}>
          {/* mic — tekan untuk bicara (jadi kotak merah), tekan lagi untuk kirim */}
          <button
            onClick={toggleVoice}
            disabled={busy}
            aria-label={recording ? "Berhenti & kirim" : "Bicara"}
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
              opacity: busy && !recording ? 0.5 : 1,
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

          {/* foto makanan / struk */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickImage}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Foto makanan"
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              flex: "none",
              background: "var(--surface)",
              border: "1px solid var(--line2)",
              color: "var(--dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.5 : 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder={recording ? "Merekam… tekan ⏹ untuk kirim" : "Tulis makananmu…"}
            disabled={recording}
            style={{
              flex: 1,
              minWidth: 0,
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
            onClick={() => sendText()}
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

function TotalChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div style={{ padding: "6px 4px", borderRadius: 10, background: "var(--raised)", textAlign: "center" }}>
      <div style={{ font: "800 13px var(--font-archivo), sans-serif", color }}>{value}</div>
      <div style={{ font: "500 9.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 1 }}>{label}</div>
    </div>
  );
}
