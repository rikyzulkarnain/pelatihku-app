"use client";

import { startOrResumeSession } from "@/features/workout/action";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function DayCard({
  programId,
  dayId,
  num,
  name,
  meta,
  sessionDate,
}: {
  programId: string;
  dayId: string;
  num: number;
  name: string;
  meta: string;
  /** Bila diisi (yyyy-MM-dd), sesi dicatat untuk tanggal lampau tsb. */
  sessionDate?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    const res = await startOrResumeSession(programId, dayId, sessionDate);
    if (res.error || !res.sessionId) {
      setLoading(false);
      toast.error(res.error ?? "Gagal membuka sesi.");
      return;
    }
    router.push(`/session/${res.sessionId}`);
  }

  return (
    <button
      onClick={open}
      disabled={loading}
      style={{
        textAlign: "left",
        borderRadius: 20,
        padding: 18,
        background: "var(--surface)",
        border: "1px solid var(--line2)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(201,251,60,.12)",
          color: "var(--acc)",
          font: "800 18px var(--font-archivo), sans-serif",
        }}
      >
        {num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "800 17px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
          {name}
        </div>
        <div style={{ font: "600 13px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 3 }}>
          {meta}
        </div>
      </div>
      <span style={{ color: "var(--faint)", fontSize: 22 }}>›</span>
    </button>
  );
}
