"use client";

import PhoneShell from "@/components/common/phone-shell";
import { generateAndCreateProgram } from "@/features/program/action";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function GeneratingPage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const startedAt = Date.now();
      const res = await generateAndCreateProgram();
      // Keep the spinner visible at least 1.6s for a smooth transition.
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, 1600 - elapsed);

      setTimeout(() => {
        if (res.error) {
          toast.error(res.error);
          router.push("/onboarding");
        } else {
          router.replace("/home");
        }
      }, wait);
    };

    run();
  }, [router]);

  return (
    <PhoneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "4px solid var(--raised)",
            borderTopColor: "var(--acc)",
            animation: "pk-spin 1s linear infinite",
          }}
        />
        <h2
          style={{
            font: "800 24px var(--font-archivo), sans-serif",
            color: "var(--ink)",
            margin: "34px 0 8px",
          }}
        >
          Menyusun program kamu…
        </h2>
        <p
          style={{
            font: "500 15px/1.5 var(--font-jakarta), sans-serif",
            color: "var(--dim)",
            maxWidth: 240,
          }}
        >
          Mencocokkan tujuan, level & frekuensi jadi jadwal mingguan yang pas.
        </p>
      </div>
    </PhoneShell>
  );
}
