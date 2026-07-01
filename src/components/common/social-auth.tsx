"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export default function SocialAuth() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    // On success the browser is redirected to Google, so we only reset on error.
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  }

  const btn: React.CSSProperties = {
    flex: 1,
    padding: 13,
    borderRadius: 14,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "var(--ink)",
    font: "700 14px var(--font-archivo), sans-serif",
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
          atau lanjut dengan
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{ ...btn, opacity: loading ? 0.6 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C39.9 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
          </svg>
          {loading ? "Menghubungkan…" : "Google"}
        </button>
      </div>
    </>
  );
}
