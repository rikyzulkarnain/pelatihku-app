"use client";

import { applyProgression } from "@/features/program/action";
import { LEVEL_LABEL } from "@/constants/labels";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ProgressionCard({
  nextLevel,
  reason,
}: {
  nextLevel: string;
  reason: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function upgrade() {
    setLoading(true);
    const res = await applyProgression();
    setLoading(false);
    if (res.error || !res.new_level) {
      toast.error(res.error ?? "Gagal menyesuaikan program.");
      return;
    }
    toast.success(
      `Program disesuaikan — level kamu sekarang ${LEVEL_LABEL[res.new_level]}.`,
    );
    router.refresh();
  }

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background: "rgba(201,251,60,.1)",
        border: "1px solid rgba(201,251,60,.35)",
      }}
    >
      <div
        style={{
          font: "800 11px var(--font-archivo), sans-serif",
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--acc)",
        }}
      >
        Waktunya naik level
      </div>
      <p
        style={{
          font: "500 13px/1.5 var(--font-jakarta), sans-serif",
          color: "var(--ink)",
          margin: "8px 0 12px",
        }}
      >
        {reason} Program baru level {LEVEL_LABEL[nextLevel] ?? nextLevel} siap
        disusun: set lebih banyak, variasi gerakan baru, istirahat lebih padat.
      </p>
      <button
        onClick={upgrade}
        disabled={loading}
        style={{
          borderRadius: 12,
          padding: "10px 16px",
          background: "var(--acc)",
          color: "#111",
          font: "800 13px var(--font-archivo), sans-serif",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Menyusun program..." : "Sesuaikan program sekarang"}
      </button>
    </div>
  );
}
