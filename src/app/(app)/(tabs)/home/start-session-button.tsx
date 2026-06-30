"use client";

import { startOrResumeSession } from "@/features/workout/action";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function StartSessionButton({
  programId,
  dayId,
}: {
  programId: string;
  dayId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await startOrResumeSession(programId, dayId);
    if (res.error || !res.sessionId) {
      setLoading(false);
      toast.error(res.error ?? "Gagal memulai sesi.");
      return;
    }
    router.push(`/session/${res.sessionId}`);
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "13px 22px",
        borderRadius: 14,
        background: "#10130a",
        color: "var(--acc)",
        font: "800 15px var(--font-archivo), sans-serif",
        whiteSpace: "nowrap",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Memuat…" : "Mulai sesi ▸"}
    </button>
  );
}
