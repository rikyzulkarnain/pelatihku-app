"use client";

import { EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL } from "@/constants/labels";
import { searchExercises } from "@/features/library/action";
import { Exercise } from "@/types/program";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function LibraryView({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [matchedIds, setMatchedIds] = useState<string[] | null>(null);
  const [open, setOpen] = useState<Exercise | null>(null);

  const muscles = useMemo(() => {
    const set = new Set(exercises.map((e) => e.muscle_group));
    return ["all", ...Array.from(set)];
  }, [exercises]);

  // Debounced semantic search.
  useEffect(() => {
    if (!query.trim()) {
      setMatchedIds(null);
      return;
    }
    const t = setTimeout(async () => {
      const ids = await searchExercises(query);
      setMatchedIds(ids);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const items = useMemo(() => {
    if (matchedIds) {
      const byId = new Map(exercises.map((e) => [e.id, e]));
      return matchedIds.map((id) => byId.get(id)).filter(Boolean) as Exercise[];
    }
    if (filter === "all") return exercises;
    return exercises.filter((e) => e.muscle_group === filter);
  }, [exercises, filter, matchedIds]);

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0 16px" }}>
        <button
          onClick={() => router.push("/home")}
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
        <h1 style={{ font: "900 24px var(--font-archivo), sans-serif", color: "var(--ink)", margin: 0 }}>
          Pustaka Gerakan
        </h1>
      </div>

      {/* semantic search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari gerakan (mis. dada, dorong, lutut aman)…"
        style={{
          width: "100%",
          padding: "13px 16px",
          borderRadius: 14,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          font: "500 14px var(--font-jakarta), sans-serif",
          outline: "none",
          marginBottom: 14,
        }}
      />

      {!matchedIds && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }} className="no-scrollbar">
          {muscles.map((m) => {
            const active = filter === m;
            return (
              <button
                key={m}
                onClick={() => setFilter(m)}
                style={{
                  padding: "9px 15px",
                  borderRadius: 12,
                  whiteSpace: "nowrap",
                  flex: "none",
                  font: "700 13px var(--font-archivo), sans-serif",
                  background: active ? "var(--lime)" : "var(--surface)",
                  color: active ? "#10130a" : "var(--dim)",
                  border: active ? "none" : "1px solid var(--line2)",
                }}
              >
                {m === "all" ? "Semua" : MUSCLE_LABEL[m] ?? m}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.length === 0 && (
          <p style={{ font: "500 14px var(--font-jakarta), sans-serif", color: "var(--dim)", textAlign: "center", marginTop: 24 }}>
            Tidak ada gerakan yang cocok.
          </p>
        )}
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setOpen(it)}
            style={{
              textAlign: "left",
              borderRadius: 16,
              padding: 14,
              background: "var(--surface)",
              border: "1px solid var(--line2)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 13,
                background: "linear-gradient(150deg,var(--raised),var(--raised2))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--acc)" }} strokeWidth="2" strokeLinecap="round">
                <path d="M6.5 6.5l11 11M3 3l1 1M18 22l4-4M2 6l4-4M6.5 17.5l-4 4M17.5 6.5l4-4" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 15px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                {it.name}
              </div>
              <div style={{ font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                {MUSCLE_LABEL[it.muscle_group] ?? it.muscle_group} ·{" "}
                {EQUIPMENT_LABEL[it.equipment] ?? it.equipment}
              </div>
            </div>
            <span
              style={{
                font: "600 11px var(--font-archivo), sans-serif",
                textTransform: "uppercase",
                letterSpacing: ".04em",
                color: "var(--dim)",
                padding: "4px 9px",
                borderRadius: 8,
                background: "var(--raised)",
              }}
            >
              {LEVEL_LABEL[it.level] ?? it.level}
            </span>
          </button>
        ))}
      </div>

      {open && <ExerciseSheet exercise={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ExerciseSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 85,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "88%",
          overflowY: "auto",
          background: "var(--sheet)",
          borderRadius: "28px 28px 0 0",
          borderTop: "1px solid rgba(201,251,60,.18)",
          padding: "10px 22px 30px",
          animation: "pk-up .3s both",
        }}
        className="no-scrollbar"
      >
        <div style={{ width: 42, height: 5, borderRadius: 5, background: "var(--raised2)", margin: "6px auto 18px" }} />
        <div
          style={{
            height: 170,
            borderRadius: 18,
            background: "linear-gradient(150deg,var(--raised),var(--surface))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(201,251,60,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pk-pulse 2s ease-in-out infinite",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" style={{ fill: "var(--acc)" }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
            Video teknik (placeholder)
          </span>
        </div>

        <h2 style={{ font: "900 24px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "0 0 6px" }}>
          {exercise.name}
        </h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ font: "600 12px var(--font-archivo), sans-serif", color: "var(--acc)", padding: "5px 11px", borderRadius: 9, background: "rgba(201,251,60,.1)" }}>
            {MUSCLE_LABEL[exercise.muscle_group] ?? exercise.muscle_group}
          </span>
          <span style={{ font: "600 12px var(--font-archivo), sans-serif", color: "var(--dim)", padding: "5px 11px", borderRadius: 9, background: "var(--raised)" }}>
            {EQUIPMENT_LABEL[exercise.equipment] ?? exercise.equipment}
          </span>
        </div>

        <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 12 }}>
          Cara melakukan
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
          {exercise.technique_steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--lime)",
                  color: "#10130a",
                  font: "800 13px var(--font-archivo), sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                {i + 1}
              </div>
              <div style={{ font: "500 14px/1.5 var(--font-jakarta), sans-serif", color: "var(--ink2)", paddingTop: 2 }}>
                {step}
              </div>
            </div>
          ))}
        </div>

        {exercise.injury_cautions.length > 0 && (
          <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,122,60,.08)", border: "1px solid rgba(255,122,60,.18)" }}>
            <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#ff9a5c", marginBottom: 6 }}>
              ⚠ Hindari cedera
            </div>
            <div style={{ font: "500 13px/1.5 var(--font-jakarta), sans-serif", color: "var(--ink2)" }}>
              Hati-hati jika punya keluhan pada{" "}
              {exercise.injury_cautions
                .map((c) => c.replace(/_/g, " "))
                .join(", ")}
              . Jaga teknik, mulai dari beban ringan, dan hentikan bila terasa nyeri tajam.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
