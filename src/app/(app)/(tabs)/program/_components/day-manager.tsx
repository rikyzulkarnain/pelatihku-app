"use client";

import BackdateSelector, {
  backdateLabel,
} from "@/components/common/backdate-selector";
import {
  EQUIPMENT_LABEL,
  LEVEL_LABEL,
  PATTERN_LABEL,
} from "@/constants/labels";
import {
  AIRecommendation,
  DayDetail,
  OverrideHistoryItem,
  getDayDetail,
  getOverrideHistory,
  getSwapCandidates,
  recommendExercise,
  removeExerciseOverride,
  setExerciseOverride,
} from "@/features/program/override";
import { Exercise } from "@/types/program";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type PanelState = {
  programExerciseId: string;
  candidates: Exercise[] | null;
  ai: { summary: string; recommendations: AIRecommendation[] } | null;
  aiLoading: boolean;
};

export default function DayManager({
  initialDetail,
  initialHistory,
}: {
  initialDetail: DayDetail;
  initialHistory: OverrideHistoryItem[];
}) {
  const [date, setDate] = useState(todayStr);
  const [detail, setDetail] = useState<DayDetail>(initialDetail);
  const [history, setHistory] = useState<OverrideHistoryItem[]>(initialHistory);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [pending, startTransition] = useTransition();

  async function refresh(nextDate: string) {
    const [d, h] = await Promise.all([
      getDayDetail(detail.day_id, nextDate),
      getOverrideHistory(detail.day_id),
    ]);
    if (d) setDetail(d);
    setHistory(h);
  }

  function changeDate(next: string) {
    setDate(next);
    setPanel(null);
    startTransition(() => refresh(next));
  }

  async function openPanel(programExerciseId: string) {
    if (panel?.programExerciseId === programExerciseId) {
      setPanel(null);
      return;
    }
    setPanel({ programExerciseId, candidates: null, ai: null, aiLoading: false });
    const res = await getSwapCandidates(programExerciseId);
    if (res.error) {
      toast.error(res.error);
      setPanel(null);
      return;
    }
    setPanel((p) =>
      p?.programExerciseId === programExerciseId
        ? { ...p, candidates: res.candidates ?? [] }
        : p,
    );
  }

  async function runAI(programExerciseId: string) {
    setPanel((p) =>
      p?.programExerciseId === programExerciseId ? { ...p, aiLoading: true } : p,
    );
    const res = await recommendExercise({ programExerciseId });
    if (res.error) {
      toast.error(res.error);
      setPanel((p) =>
        p?.programExerciseId === programExerciseId
          ? { ...p, aiLoading: false }
          : p,
      );
      return;
    }
    setPanel((p) =>
      p?.programExerciseId === programExerciseId
        ? {
            ...p,
            aiLoading: false,
            ai: {
              summary: res.summary ?? "",
              recommendations: res.recommendations ?? [],
            },
          }
        : p,
    );
  }

  async function apply(
    programExerciseId: string,
    replacementExerciseId: string,
    source: "custom" | "ai",
    reason?: string,
  ) {
    const res = await setExerciseOverride({
      programExerciseId,
      replacementExerciseId,
      date,
      source,
      reason,
    });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Latihan diganti untuk ${backdateLabel(date)} (tidak permanen).`);
    setPanel(null);
    startTransition(() => refresh(date));
  }

  async function restore(overrideId: string) {
    const res = await removeExerciseOverride(overrideId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Kembali ke latihan asli program.");
    startTransition(() => refresh(date));
  }

  const card: React.CSSProperties = {
    borderRadius: 20,
    padding: 16,
    background: "var(--surface)",
    border: "1px solid var(--line2)",
  };
  const smallBtn = (accent = false): React.CSSProperties => ({
    padding: "8px 13px",
    borderRadius: 11,
    font: "700 12.5px var(--font-archivo), sans-serif",
    whiteSpace: "nowrap",
    background: accent ? "rgba(201,251,60,.12)" : "var(--raised)",
    color: accent ? "var(--acc)" : "var(--dim)",
    border: `1px solid ${accent ? "rgba(201,251,60,.3)" : "var(--line2)"}`,
  });

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      <div style={{ padding: "8px 0 6px" }}>
        <Link
          href="/program"
          style={{
            font: "700 13px var(--font-archivo), sans-serif",
            color: "var(--dim)",
            textDecoration: "none",
          }}
        >
          ‹ Program
        </Link>
        <h1 style={{ font: "900 24px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "10px 0 2px" }}>
          {detail.label}
        </h1>
        <p style={{ font: "500 13.5px var(--font-jakarta), sans-serif", color: "var(--dim)", margin: 0 }}>
          {detail.focus ?? ""} · ganti latihan berlaku <b>sementara</b> untuk satu tanggal
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "12px 0 16px" }}>
        <span
          style={{
            font: "800 11px var(--font-archivo), sans-serif",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          Berlaku untuk tanggal
        </span>
        <BackdateSelector value={date} onChange={changeDate} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: pending ? 0.6 : 1 }}>
        {detail.exercises.map((ex) => {
          const effective = ex.override?.replacement ?? ex.exercise;
          const open = panel?.programExerciseId === ex.program_exercise_id;
          return (
            <div key={ex.program_exercise_id} style={card}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "800 15.5px/1.25 var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                    {effective.name}
                  </div>
                  {ex.override && (
                    <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "#ff9a5c", marginTop: 3 }}>
                      {ex.override.source === "ai" ? "✨ Rekomendasi AI" : "Custom"} · menggantikan{" "}
                      <s>{ex.exercise.name}</s> pada {backdateLabel(date)}
                    </div>
                  )}
                  <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 4 }}>
                    {PATTERN_LABEL[effective.movement_pattern] ?? effective.movement_pattern} ·{" "}
                    {EQUIPMENT_LABEL[effective.equipment] ?? effective.equipment} · {ex.target_sets} set ×{" "}
                    {ex.target_rep_low}-{ex.target_rep_high}
                  </div>
                  {ex.override?.reason && (
                    <div style={{ font: "500 12px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 6 }}>
                      “{ex.override.reason}”
                    </div>
                  )}
                </div>
                {ex.override ? (
                  <button style={smallBtn()} onClick={() => restore(ex.override!.id)}>
                    Kembalikan
                  </button>
                ) : (
                  <button
                    style={smallBtn(true)}
                    onClick={() => openPanel(ex.program_exercise_id)}
                  >
                    {open ? "Tutup" : "Ganti"}
                  </button>
                )}
              </div>

              {open && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line2)", paddingTop: 12 }}>
                  <button
                    style={{
                      ...smallBtn(true),
                      width: "100%",
                      padding: "11px 13px",
                      opacity: panel.aiLoading ? 0.6 : 1,
                    }}
                    disabled={panel.aiLoading}
                    onClick={() => runAI(ex.program_exercise_id)}
                  >
                    {panel.aiLoading
                      ? "AI mempelajari track record kamu…"
                      : "✨ Minta rekomendasi AI (berdasarkan track record)"}
                  </button>

                  {panel.ai && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {panel.ai.summary && (
                        <div style={{ font: "500 12.5px/1.55 var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                          {panel.ai.summary}
                        </div>
                      )}
                      {panel.ai.recommendations.map((r) => (
                        <div
                          key={r.slug}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 13,
                            padding: "10px 12px",
                            background: "rgba(201,251,60,.06)",
                            border: "1px solid rgba(201,251,60,.18)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ font: "800 13.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                              {r.name}
                            </div>
                            <div style={{ font: "500 12px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                              {r.reason}
                            </div>
                          </div>
                          <button
                            style={smallBtn(true)}
                            onClick={() =>
                              apply(ex.program_exercise_id, r.exercise_id, "ai", r.reason)
                            }
                          >
                            Pakai
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      font: "800 11px var(--font-archivo), sans-serif",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      color: "var(--dim)",
                      margin: "14px 0 8px",
                    }}
                  >
                    Atau pilih sendiri (kategori sama)
                  </div>
                  {panel.candidates === null ? (
                    <div style={{ font: "500 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                      Memuat kandidat…
                    </div>
                  ) : panel.candidates.length === 0 ? (
                    <div style={{ font: "500 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                      Tidak ada gerakan lain yang aman untuk kategori ini.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {panel.candidates.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 13,
                            padding: "10px 12px",
                            background: "var(--raised)",
                            border: "1px solid var(--line2)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ font: "700 13.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                              {c.name}
                            </div>
                            <div style={{ font: "500 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                              {EQUIPMENT_LABEL[c.equipment] ?? c.equipment} ·{" "}
                              {LEVEL_LABEL[c.level] ?? c.level}
                            </div>
                          </div>
                          <button
                            style={smallBtn()}
                            onClick={() =>
                              apply(ex.program_exercise_id, c.id, "custom")
                            }
                          >
                            Pakai
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            font: "800 11px var(--font-archivo), sans-serif",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--dim)",
            marginBottom: 10,
          }}
        >
          Riwayat penggantian
        </div>
        {history.length === 0 ? (
          <div style={{ font: "500 13px var(--font-jakarta), sans-serif", color: "var(--faint)" }}>
            Belum ada penggantian tersimpan untuk hari program ini.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  borderRadius: 14,
                  padding: "11px 13px",
                  background: "var(--surface)",
                  border: "1px solid var(--line2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "800 12.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                    {backdateLabel(h.override_date)}
                  </span>
                  <span
                    style={{
                      font: "700 10.5px var(--font-archivo), sans-serif",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      padding: "3px 7px",
                      borderRadius: 7,
                      background: h.source === "ai" ? "rgba(201,251,60,.12)" : "var(--raised)",
                      color: h.source === "ai" ? "var(--acc)" : "var(--dim)",
                    }}
                  >
                    {h.source === "ai" ? "✨ AI" : "Custom"}
                  </span>
                </div>
                <div style={{ font: "600 12.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 4 }}>
                  <s>{h.original_name}</s> → <b style={{ color: "var(--ink)" }}>{h.replacement_name}</b>
                </div>
                {h.reason && (
                  <div style={{ font: "500 11.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--faint)", marginTop: 3 }}>
                    “{h.reason}”
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
