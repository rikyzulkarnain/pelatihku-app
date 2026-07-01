"use client";

import PhoneShell from "@/components/common/phone-shell";
import PkButton from "@/components/common/pk-button";
import ThemeToggle from "@/components/common/theme-toggle";
import { useInstall } from "@/providers/install-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function WelcomeView() {
  const router = useRouter();
  const { canInstall, isIOS, installed, promptInstall } = useInstall();
  const showInstall = !installed && (canInstall || isIOS);

  return (
    <PhoneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "0 28px 30px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12 }}>
          <ThemeToggle />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            paddingBottom: 34,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: "linear-gradient(150deg,#cdf93f,#9fe119)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 16px 40px -12px rgba(201,251,60,.55)",
              marginBottom: 26,
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#10130a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5l11 11M3 4l1 1M20 21l1-1M6 17l-2.5 2.5M18 7l2.5-2.5" />
              <rect x="2" y="9" width="4" height="6" rx="1.4" transform="rotate(-45 4 12)" />
            </svg>
          </div>
          <div
            style={{
              font: "800 12px var(--font-archivo), sans-serif",
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "var(--acc)",
              marginBottom: 14,
            }}
          >
            PelatihKu
          </div>
          <h1
            style={{
              font: "900 34px/1.08 var(--font-archivo), sans-serif",
              color: "var(--ink)",
              margin: "0 0 14px",
              letterSpacing: "-.02em",
            }}
          >
            Bentuk tubuh
            <br />
            impianmu.
          </h1>
          <p
            style={{
              font: "500 16px/1.5 var(--font-jakarta), sans-serif",
              color: "var(--dim)",
              margin: 0,
              maxWidth: 300,
            }}
          >
            Program latihan, panduan teknik, nutrisi & coach pribadi — semua dalam
            satu genggaman.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {showInstall && (
            <PkButton
              variant="outline"
              onClick={() =>
                canInstall
                  ? promptInstall()
                  : toast.info(
                      "Di iPhone: ketuk Bagikan ⬆️ di Safari, lalu “Tambah ke Layar Utama”.",
                    )
              }
            >
              📲 Install aplikasi
            </PkButton>
          )}
          <PkButton onClick={() => router.push("/register")}>
            Buat akun gratis
          </PkButton>
          <PkButton variant="outline" onClick={() => router.push("/login")}>
            Saya sudah punya akun
          </PkButton>
          <PkButton variant="ghost" onClick={() => router.push("/login")}>
            Lanjut sebagai tamu
          </PkButton>
        </div>
      </div>
    </PhoneShell>
  );
}
