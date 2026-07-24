"use client";

import { FeedbackType, submitFeedback } from "@/features/feedback/action";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: "saran", label: "Saran", icon: "💡" },
  { value: "bug", label: "Lapor bug", icon: "🐞" },
  { value: "lainnya", label: "Lainnya", icon: "💬" },
];

export default function FeedbackCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          marginTop: 14,
          borderRadius: 20,
          padding: 18,
          background: "var(--surface)",
          border: "1px solid var(--line2)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 44,
            height: 44,
            flex: "none",
            borderRadius: 14,
            background: "rgba(201,251,60,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          📣
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", font: "700 15px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Kirim saran / lapor bug
          </span>
          <span style={{ display: "block", font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
            Bantu kami kembangkan Pelatihku
          </span>
        </span>
        <span style={{ color: "var(--faint)", fontSize: 20, flex: "none" }}>›</span>
      </button>

      {open && <FeedbackSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [type, setType] = useState<FeedbackType>("saran");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const clean = message.trim();
    if (clean.length < 3) {
      toast.error("Tulis masukanmu dulu ya.");
      return;
    }
    setSending(true);
    const res = await submitFeedback({ type, message: clean, page: pathname });
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Terima kasih! Masukanmu sudah terkirim 💚");
    onClose();
  }

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
          maxHeight: "82%",
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
          <div style={{ flex: 1 }}>
            <div style={{ font: "800 16px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
              Saran & masukan
            </div>
            <div style={{ font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
              Ada ide fitur atau menemukan bug? Ceritakan di sini.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line2)", color: "var(--dim)", fontSize: 18, lineHeight: 1, flex: "none" }}
          >
            ✕
          </button>
        </div>

        <div className="no-scrollbar" style={{ overflowY: "auto", padding: "16px 20px 24px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {TYPES.map((t) => {
              const active = t.value === type;
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: 13,
                    background: active ? "var(--lime)" : "var(--surface)",
                    border: active ? "none" : "1px solid var(--line2)",
                    color: active ? "#10130a" : "var(--dim)",
                    font: "800 12.5px var(--font-archivo), sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 17 }}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={4000}
            rows={5}
            autoFocus
            placeholder={
              type === "bug"
                ? "Ceritakan bug-nya: apa yang terjadi & langkah sebelumnya…"
                : "Tulis saran atau masukanmu di sini…"
            }
            style={{
              width: "100%",
              resize: "vertical",
              padding: "13px 15px",
              borderRadius: 16,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              font: "500 14px/1.5 var(--font-jakarta), sans-serif",
              outline: "none",
            }}
          />
          <div style={{ textAlign: "right", font: "500 11px var(--font-jakarta), sans-serif", color: "var(--faint)", marginTop: 4 }}>
            {message.length}/4000
          </div>

          <button
            onClick={send}
            disabled={sending || message.trim().length < 3}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 15,
              borderRadius: 16,
              background: "var(--lime)",
              color: "#10130a",
              font: "800 15px var(--font-archivo), sans-serif",
              opacity: sending || message.trim().length < 3 ? 0.55 : 1,
            }}
          >
            {sending ? "Mengirim…" : "Kirim masukan"}
          </button>
        </div>
      </div>
    </div>
  );
}
