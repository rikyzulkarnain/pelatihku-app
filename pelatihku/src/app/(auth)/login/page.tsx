"use client";

import PhoneShell from "@/components/common/phone-shell";
import PkButton from "@/components/common/pk-button";
import PkInput from "@/components/common/pk-input";
import ScreenHeader from "@/components/common/screen-header";
import { loginAction } from "@/features/auth/action";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await loginAction({ email, password });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.next) router.push(res.next);
  }

  return (
    <PhoneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "8px 28px 26px",
          overflowY: "auto",
        }}
        className="no-scrollbar"
      >
        <ScreenHeader back="/" />

        <div style={{ marginTop: 22 }}>
          <h1
            style={{
              font: "900 30px var(--font-archivo), sans-serif",
              color: "var(--ink)",
              margin: "0 0 6px",
              letterSpacing: "-.01em",
            }}
          >
            Selamat datang kembali
          </h1>
          <p
            style={{
              font: "500 15px var(--font-jakarta), sans-serif",
              color: "var(--dim)",
              margin: "0 0 26px",
            }}
          >
            Masuk untuk lanjutkan progresmu.
          </p>

          <PkInput
            label="Email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PkInput
            label="Kata sandi"
            password
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />

          <div style={{ textAlign: "right", margin: "10px 0 18px" }}>
            <button
              onClick={() => toast.info("Fitur ini segera hadir.")}
              style={{
                font: "600 13px var(--font-jakarta), sans-serif",
                color: "var(--acc)",
              }}
            >
              Lupa kata sandi?
            </button>
          </div>

          <PkButton onClick={submit} loading={loading}>
            Masuk
          </PkButton>

          <SocialDivider />
          <SocialButtons />
        </div>

        <div style={{ flex: 1, minHeight: 18 }} />

        <div
          style={{
            textAlign: "center",
            font: "600 14px var(--font-jakarta), sans-serif",
            color: "var(--dim)",
            marginTop: 18,
          }}
        >
          Belum punya akun?{" "}
          <button
            onClick={() => router.push("/register")}
            style={{
              color: "var(--acc)",
              font: "700 14px var(--font-jakarta), sans-serif",
            }}
          >
            Daftar gratis
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

function SocialDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      <span style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
        atau lanjut dengan
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}

function SocialButtons() {
  const notify = () => toast.info("Login sosial segera hadir.");
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
    <div style={{ display: "flex", gap: 10 }}>
      <button onClick={notify} style={btn}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C39.9 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
        </svg>
        Google
      </button>
      <button onClick={notify} style={btn}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7 1.9-1.1 2.6-2.1c.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.2 6c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.6-.9 2.6 1 0 2-.5 2.5-1.2z" />
        </svg>
        Apple
      </button>
    </div>
  );
}
