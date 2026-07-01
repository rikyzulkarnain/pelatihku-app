"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent;
    // iOS Safari tidak mendukung beforeinstallprompt → butuh instruksi manual.
    if (/iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)) setIsIOS(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Aplikasi terpasang! 🎉");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDeferred(null);
  }

  // Sudah terpasang / dibuka sebagai app → sembunyikan.
  if (installed) return null;
  // Bukan iOS dan browser belum menawarkan install → jangan tampilkan tombol mati.
  if (!deferred && !isIOS) return null;

  return (
    <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            flex: "none",
            borderRadius: 13,
            background: "var(--lime)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#10130a" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "800 14.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Install aplikasi
          </div>
          <div style={{ font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
            Pasang di HP biar bisa dibuka seperti aplikasi biasa.
          </div>
        </div>
      </div>

      {isIOS ? (
        <div style={{ marginTop: 12, borderRadius: 12, padding: "11px 13px", background: "var(--raised)", font: "500 12.5px/1.6 var(--font-jakarta), sans-serif", color: "var(--ink2)" }}>
          Di iPhone: ketuk tombol <b>Bagikan</b> <span style={{ color: "var(--acc)" }}>⬆️</span> di Safari, lalu pilih <b>“Tambah ke Layar Utama”</b>.
        </div>
      ) : (
        <button
          onClick={install}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 13,
            borderRadius: 14,
            background: "var(--lime)",
            color: "#10130a",
            font: "800 14px var(--font-archivo), sans-serif",
          }}
        >
          Pasang sekarang
        </button>
      )}
    </div>
  );
}
