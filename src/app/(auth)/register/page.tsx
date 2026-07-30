"use client";

import PhoneShell from "@/components/common/phone-shell";
import PkButton from "@/components/common/pk-button";
import PkInput from "@/components/common/pk-input";
import ScreenHeader from "@/components/common/screen-header";
import SocialAuth from "@/components/common/social-auth";
import { registerAction } from "@/features/auth/action";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await registerAction({ name, email, password });
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
            Buat akun baru
          </h1>
          <p
            style={{
              font: "500 15px var(--font-jakarta), sans-serif",
              color: "var(--dim)",
              margin: "0 0 26px",
            }}
          >
            Mulai perjalanan kebugaranmu hari ini.
          </p>

          <PkInput
            label="Nama"
            placeholder="Nama panggilanmu"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />

          <div style={{ marginTop: 8 }}>
            <PkButton onClick={submit} loading={loading}>
              Daftar & susun program
            </PkButton>
          </div>

          <SocialAuth />

          <p
            style={{
              font: "500 12px/1.5 var(--font-jakarta), sans-serif",
              color: "var(--dim)",
              textAlign: "center",
              margin: "14px 6px 0",
            }}
          >
            Dengan mendaftar, kamu menyetujui{" "}
            <span style={{ color: "var(--acc)" }}>Ketentuan</span> &{" "}
            <Link href="/privacy" style={{ color: "var(--acc)" }}>
              Kebijakan Privasi
            </Link>
            .
          </p>
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
          Sudah punya akun?{" "}
          <button
            onClick={() => router.push("/login")}
            style={{
              color: "var(--acc)",
              font: "700 14px var(--font-jakarta), sans-serif",
            }}
          >
            Masuk
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
