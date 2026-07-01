"use client";

import { ExerciseSheet } from "@/components/common/exercise-sheet";
import { completeSession, logSet, removeSet, SessionData } from "@/features/workout/action";
import { formatNumber } from "@/lib/utils";
import { Exercise } from "@/types/program";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ExState = { weight: number; done: Set<number> };

export default function SessionView({ data }: { data: SessionData }) {
  const router = useRouter();

  const [state, setState] = useState<Record<string, ExState>>(() => {
    const init: Record<string, ExState> = {};
    for (const ex of data.exercises) {
      init[ex.exercise.id] = {
        weight: ex.logged[0]?.weight_kg ?? ex.suggestion.weight_kg,
        done: new Set(ex.logged.map((l) => l.set_index)),
      };
    }
    return init;
  });
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<{ volume: number; streak: number } | null>(null);
  const [videoOf, setVideoOf] = useState<Exercise | null>(null);

  const repsFor = (exId: string) =>
    data.exercises.find((e) => e.exercise.id === exId)?.target_rep_high ?? 10;

  const { doneCount, volume } = useMemo(() => {
    let dc = 0;
    let vol = 0;
    for (const ex of data.exercises) {
      const s = state[ex.exercise.id];
      dc += s.done.size;
      vol += s.done.size * s.weight * ex.target_rep_high;
    }
    return { doneCount: dc, volume: Math.round(vol) };
  }, [state, data.exercises]);

  function setWeight(exId: string, delta: number) {
    setState((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], weight: Math.max(0, prev[exId].weight + delta) },
    }));
  }

  async function toggleSet(exId: string, setIndex: number) {
    const cur = state[exId];
    const isDone = cur.done.has(setIndex);
    const nextDone = new Set(cur.done);
    if (isDone) nextDone.delete(setIndex);
    else nextDone.add(setIndex);
    setState((prev) => ({ ...prev, [exId]: { ...prev[exId], done: nextDone } }));

    if (isDone) {
      await removeSet({ sessionId: data.session_id, exerciseId: exId, setIndex });
    } else {
      const res = await logSet({
        sessionId: data.session_id,
        exerciseId: exId,
        setIndex,
        weightKg: cur.weight,
        reps: repsFor(exId),
      });
      if (res.error) toast.error(res.error);
    }
  }

  async function finish() {
    if (doneCount === 0) {
      toast.info("Catat minimal satu set dulu ya.");
      return;
    }
    setFinishing(true);
    const res = await completeSession(data.session_id);
    setFinishing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSummary({ volume: res.volume, streak: res.streak });
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 20px 12px" }}>
        <button
          onClick={() => router.push("/program")}
          aria-label="Kembali"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "var(--dim)",
          }}
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ font: "800 18px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            {data.day_label}
          </div>
          <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
            {doneCount} set selesai
          </div>
        </div>
        <div style={{ font: "800 15px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
          {formatNumber(volume)} kg
        </div>
      </div>

      {/* exercises */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 20px 120px" }} className="no-scrollbar">
        {data.rest_warning && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: "rgba(255,154,92,.1)",
              border: "1px solid rgba(255,154,92,.28)",
              borderRadius: 14,
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1.2 }}>😴</span>
            <span style={{ font: "600 12.5px/1.5 var(--font-jakarta), sans-serif", color: "#ff9a5c" }}>
              {data.rest_warning}
            </span>
          </div>
        )}
        {data.exercises.map((ex) => {
          const s = state[ex.exercise.id];
          return (
            <div
              key={ex.exercise.id}
              style={{
                borderRadius: 20,
                padding: 16,
                background: "var(--surface)",
                border: "1px solid var(--line2)",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <div style={{ font: "800 16px/1.2 var(--font-archivo), sans-serif", color: "var(--ink)", flex: 1, minWidth: 0 }}>
                  {ex.exercise.name}
                </div>
                <span
                  style={{
                    font: "600 11px var(--font-archivo), sans-serif",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                    color: "var(--dim)",
                    padding: "4px 9px",
                    borderRadius: 8,
                    background: "var(--raised)",
                    whiteSpace: "nowrap",
                    flex: "none",
                    marginTop: 2,
                  }}
                >
                  {ex.exercise.muscle_group}
                </span>
              </div>
              <div style={{ font: "600 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginBottom: 12 }}>
                {ex.target_sets} set × {ex.target_rep_low}-{ex.target_rep_high} · terakhir {ex.last_label}
              </div>

              {ex.suggestion.message && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(201,251,60,.08)",
                    border: "1px solid rgba(201,251,60,.18)",
                    borderRadius: 12,
                    padding: "9px 12px",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13 }}>📈</span>
                  <span style={{ font: "600 12.5px var(--font-jakarta), sans-serif", color: "var(--acc)" }}>
                    {ex.suggestion.message}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <button onClick={() => setWeight(ex.exercise.id, -2.5)} style={stepBtn}>
                  −
                </button>
                <div style={{ textAlign: "center", minWidth: 70 }}>
                  <span style={{ font: "900 22px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                    {s.weight}
                  </span>
                  <span style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--dim)" }}> kg</span>
                </div>
                <button onClick={() => setWeight(ex.exercise.id, 2.5)} style={stepBtn}>
                  +
                </button>
                <div style={{ flex: 1, textAlign: "right", font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                  ketuk set bila selesai
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Array.from({ length: ex.target_sets }).map((_, i) => {
                  const idx = i + 1;
                  const done = s.done.has(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleSet(ex.exercise.id, idx)}
                      style={{
                        padding: "9px 14px",
                        borderRadius: 11,
                        font: "700 13px var(--font-archivo), sans-serif",
                        background: done ? "var(--lime)" : "var(--raised)",
                        color: done ? "#10130a" : "var(--dim)",
                        border: done ? "none" : "1px solid var(--line2)",
                      }}
                    >
                      {done ? "✓ " : ""}Set {idx}
                    </button>
                  );
                })}

                {ex.exercise.video_url && (
                  <button
                    onClick={() => setVideoOf(ex.exercise)}
                    aria-label="Lihat video teknik"
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "9px 13px",
                      borderRadius: 11,
                      background: "rgba(201,251,60,.1)",
                      border: "1px solid rgba(201,251,60,.22)",
                      color: "var(--acc)",
                      font: "700 12.5px var(--font-archivo), sans-serif",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: "var(--acc)", flex: "none" }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Video
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* finish */}
      <div style={{ padding: "14px 20px 26px", background: "linear-gradient(0deg,var(--phone-bg) 60%,transparent)" }}>
        <button
          onClick={finish}
          disabled={finishing}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 18,
            background: "var(--lime)",
            color: "#10130a",
            font: "800 17px var(--font-archivo), sans-serif",
            boxShadow: "0 12px 30px -10px rgba(201,251,60,.5)",
            opacity: finishing ? 0.7 : 1,
          }}
        >
          {finishing ? "Menyimpan…" : "Selesaikan sesi"}
        </button>
      </div>

      {videoOf && <ExerciseSheet exercise={videoOf} onClose={() => setVideoOf(null)} />}

      {summary && (
        <CompletionOverlay
          volume={summary.volume}
          streak={summary.streak}
          onClose={() => router.replace("/home")}
        />
      )}
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 11,
  background: "var(--raised)",
  font: "600 20px var(--font-archivo), sans-serif",
  color: "var(--ink2)",
};

function CompletionOverlay({
  volume,
  streak,
  onClose,
}: {
  volume: number;
  streak: number;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "var(--scrim)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 36,
        textAlign: "center",
      }}
    >
      <div
        style={{
          animation: "pk-pop .4s both",
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: "linear-gradient(150deg,#cdf93f,#9fe119)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 52,
          boxShadow: "0 0 60px -10px rgba(201,251,60,.6)",
        }}
      >
        💪
      </div>
      <h2 style={{ font: "900 30px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "28px 0 6px" }}>
        Sesi selesai!
      </h2>
      <p style={{ font: "600 15px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", maxWidth: 260 }}>
        Kerja bagus! Konsistensi kecil hari ini membangun hasil besar nanti.
      </p>
      <div style={{ display: "flex", gap: 28, margin: "28px 0 32px" }}>
        <div>
          <div style={{ font: "900 30px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
            {formatNumber(volume)}
          </div>
          <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
            kg terangkat
          </div>
        </div>
        <div>
          <div style={{ font: "900 30px var(--font-archivo), sans-serif", color: "#ff9a5c" }}>
            {streak}🔥
          </div>
          <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
            hari beruntun
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: 17,
          borderRadius: 16,
          background: "var(--lime)",
          color: "#10130a",
          font: "800 16px var(--font-archivo), sans-serif",
        }}
      >
        Mantap, lanjut
      </button>
    </div>
  );
}
