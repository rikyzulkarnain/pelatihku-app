"use client";

import PhoneShell from "@/components/common/phone-shell";
import PkButton from "@/components/common/pk-button";
import PkInput from "@/components/common/pk-input";
import ScreenHeader from "@/components/common/screen-header";
import SocialAuth from "@/components/common/social-auth";
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

          <SocialAuth />
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
