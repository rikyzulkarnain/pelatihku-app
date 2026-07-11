"use client";

import { backdateLabel } from "@/components/common/backdate-selector";
import { ExerciseSheet } from "@/components/common/exercise-sheet";
import AutoGenerateCard from "./auto-generate-card";
import { isHoldExercise } from "@/constants/hold-exercises";
import { EQUIPMENT_LABEL, LEVEL_LABEL } from "@/constants/labels";
import {
  AIRecommendation,
  getSwapCandidates,
  recommendExercise,
  removeExerciseOverrideForDate,
  setExerciseOverride,
} from "@/features/program/override";
import {
  completeSession,
  SessionData,
  SessionExercise,
  SetPayload,
  syncSessionSets,
} from "@/features/workout/action";
import { formatNumber } from "@/lib/utils";
import { Exercise } from "@/types/program";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type SetEntry = { done: boolean; reps: number };
type ExState = { weight: number; sets: SetEntry[] };
type SessionState = Record<string, ExState>;

/** Satuan pencatatan per jenis alat: kardio pakai menit, bodyweight pakai reps. */
function exKind(ex: Exercise): "weighted" | "bodyweight" | "cardio" {
  if (ex.equipment === "cardio") return "cardio";
  if (ex.equipment === "bodyweight") return "bodyweight";
  return "weighted";
}

/** Satuan tampilan: hold isometrik (plank dkk) dicatat dalam DETIK tahan. */
function exUnit(ex: Exercise): "mnt" | "dtk" | "reps" {
  if (ex.equipment === "cardio") return "mnt";
  if (isHoldExercise(ex.slug)) return "dtk";
  return "reps";
}

function initForExercise(ex: SessionExercise): ExState {
  const defaultReps = Math.max(1, ex.suggestion.reps || ex.target_rep_low);
  return {
    weight: ex.logged[0]?.weight_kg ?? ex.suggestion.weight_kg,
    sets: Array.from({ length: ex.target_sets }, (_, i) => {
      const logged = ex.logged.find((l) => l.set_index === i + 1);
      return logged
        ? { done: true, reps: logged.reps }
        : { done: false, reps: defaultReps };
    }),
  };
}

function buildInitialState(data: SessionData): SessionState {
  const init: SessionState = {};
  for (const ex of data.exercises) {
    init[ex.exercise.id] = initForExercise(ex);
  }
  return init;
}

/** State panel "Ubah latihan" untuk satu slot dalam sesi. */
type SwapState = {
  programExerciseId: string;
  originalName: string;
  /** Nama gerakan asli program bila slot ini sedang di-override. */
  swappedFrom: string | null;
  candidates: Exercise[] | null;
  ai: { summary: string; recommendations: AIRecommendation[] } | null;
  aiLoading: boolean;
  applying: boolean;
};

export default function SessionView({ data }: { data: SessionData }) {
  const router = useRouter();
  const storageKey = `pk-session-${data.session_id}`;

  const [state, setState] = useState<SessionState>(() => buildInitialState(data));
  const [finishing, setFinishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<{ volume: number; streak: number } | null>(null);
  const [videoOf, setVideoOf] = useState<Exercise | null>(null);
  const [swap, setSwap] = useState<SwapState | null>(null);

  // Setelah ganti latihan (router.refresh), data berisi gerakan baru yang belum
  // punya state — tambahkan tanpa menyentuh progres set yang sudah ada.
  useEffect(() => {
    setState((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const ex of data.exercises) {
        if (!merged[ex.exercise.id]) {
          merged[ex.exercise.id] = initForExercise(ex);
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [data]);

  // ---- Ganti latihan langsung dari sesi (sementara, hanya tanggal sesi ini) ----
  async function openSwap(ex: SessionExercise) {
    setSwap({
      programExerciseId: ex.program_exercise_id,
      originalName: ex.exercise.name,
      swappedFrom: ex.swapped_from,
      candidates: null,
      ai: null,
      aiLoading: false,
      applying: false,
    });
    const res = await getSwapCandidates(ex.program_exercise_id);
    if (res.error) {
      toast.error(res.error);
      setSwap(null);
      return;
    }
    setSwap((p) =>
      p?.programExerciseId === ex.program_exercise_id
        ? { ...p, candidates: res.candidates ?? [] }
        : p,
    );
  }

  async function runSwapAI() {
    if (!swap) return;
    const peId = swap.programExerciseId;
    setSwap((p) => (p?.programExerciseId === peId ? { ...p, aiLoading: true } : p));
    const res = await recommendExercise({ programExerciseId: peId });
    if (res.error) {
      toast.error(res.error);
      setSwap((p) => (p?.programExerciseId === peId ? { ...p, aiLoading: false } : p));
      return;
    }
    setSwap((p) =>
      p?.programExerciseId === peId
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

  async function applySwap(
    replacementExerciseId: string,
    source: "custom" | "ai",
    reason?: string,
  ) {
    if (!swap || swap.applying) return;
    setSwap((p) => (p ? { ...p, applying: true } : p));
    const res = await setExerciseOverride({
      programExerciseId: swap.programExerciseId,
      replacementExerciseId,
      date: data.session_date,
      source,
      reason,
    });
    if (res.error) {
      toast.error(res.error);
      setSwap((p) => (p ? { ...p, applying: false } : p));
      return;
    }
    toast.success(
      `Latihan diganti untuk ${backdateLabel(data.session_date)} saja — program asli tetap.`,
    );
    setSwap(null);
    router.refresh();
  }

  /** Batalkan penggantian slot ini → kembali ke latihan asli program. */
  async function restoreSwap() {
    if (!swap || swap.applying) return;
    setSwap((p) => (p ? { ...p, applying: true } : p));
    const res = await removeExerciseOverrideForDate(
      swap.programExerciseId,
      data.session_date,
    );
    if (res.error) {
      toast.error(res.error);
      setSwap((p) => (p ? { ...p, applying: false } : p));
      return;
    }
    toast.success("Kembali ke latihan asli program.");
    setSwap(null);
    router.refresh();
  }

  // ---- Local-first: pulihkan progres dari localStorage, simpan tiap perubahan ----
  const restored = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as SessionState;
        setState((prev) => {
          const merged: SessionState = {};
          for (const [exId, cur] of Object.entries(prev)) {
            const s = saved[exId];
            merged[exId] = s
              ? {
                  weight: typeof s.weight === "number" ? s.weight : cur.weight,
                  sets: cur.sets.map((slot, i) => s.sets?.[i] ?? slot),
                }
              : cur;
          }
          return merged;
        });
      }
    } catch {
      // localStorage rusak/terblokir → lanjut pakai data server saja.
    }
    restored.current = true;
  }, [storageKey]);

  const collectSets = useCallback(
    (st: SessionState): SetPayload[] => {
      const out: SetPayload[] = [];
      for (const ex of data.exercises) {
        const s = st[ex.exercise.id];
        if (!s) continue; // gerakan baru hasil swap, state belum ter-merge
        const kind = exKind(ex.exercise);
        s.sets.forEach((slot, i) => {
          if (!slot.done) return;
          out.push({
            exerciseId: ex.exercise.id,
            setIndex: i + 1,
            weightKg: kind === "weighted" ? s.weight : 0,
            reps: slot.reps,
          });
        });
      }
      return out;
    },
    [data.exercises],
  );

  // Sync ke server di latar belakang (debounce) — UI tidak pernah menunggu server.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const doSync = useCallback(
    async (snapshot: SessionState) => {
      setSyncing(true);
      const res = await syncSessionSets({
        sessionId: data.session_id,
        sets: collectSets(snapshot),
      });
      setSyncing(false);
      // Gagal (offline dsb.) tidak apa-apa: data aman di localStorage dan akan
      // di-flush ulang saat perubahan berikutnya / saat menyelesaikan sesi.
      return !res.error;
    },
    [data.session_id, collectSets],
  );

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
    // Hanya sync bila ada perubahan dari user, bukan saat halaman baru dibuka.
    if (!dirty.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => doSync(state), 2500);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [state, storageKey, doSync]);

  // ---- Timer istirahat ----
  // `seq` memaksa timer restart saat set baru dicentang; timestamp akhir
  // dihitung di dalam effect (aturan React Compiler: render harus pure).
  const [rest, setRest] = useState<{ seq: number; seconds: number; exName: string } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [alarming, setAlarming] = useState(false);
  const restSeq = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmGainRef = useRef<GainNode | null>(null);
  const vibrateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function ensureAudio() {
    try {
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioRef.current = new Ctx();
      }
      audioRef.current.resume();
    } catch {}
  }

  /** Matikan alarm sepenuhnya (satu-satunya cara menghentikan bunyi). */
  const stopAlarm = useCallback(() => {
    try {
      alarmGainRef.current?.disconnect();
    } catch {}
    alarmGainRef.current = null;
    if (vibrateTimerRef.current) {
      clearInterval(vibrateTimerRef.current);
      vibrateTimerRef.current = null;
    }
    try {
      navigator.vibrate?.(0);
    } catch {}
    setAlarming(false);
  }, []);

  /**
   * Alarm keras yang berbunyi TERUS-MENERUS sampai dimatikan lewat tombol.
   * Bip dijadwalkan ±6 menit ke depan langsung di audio thread (Web Audio),
   * jadi tetap berbunyi walau timer JS di-throttle saat tab di background —
   * satu-satunya cara berhenti adalah stopAlarm().
   */
  const startAlarm = useCallback(() => {
    try {
      alarmGainRef.current?.disconnect();
    } catch {}
    const ctx = audioRef.current;
    if (ctx) {
      try {
        ctx.resume();
        const master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);
        alarmGainRef.current = master;
        const t0 = ctx.currentTime;
        for (let i = 0; i < 330; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "square"; // lebih tajam & berisik daripada sine
          osc.frequency.value = i % 2 === 0 ? 950 : 1420;
          const ts = t0 + i * 1.1;
          g.gain.setValueAtTime(0.0001, ts);
          g.gain.exponentialRampToValueAtTime(0.7, ts + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.75);
          osc.connect(g);
          g.connect(master);
          osc.start(ts);
          osc.stop(ts + 0.8);
        }
      } catch {}
    }
    if (vibrateTimerRef.current) clearInterval(vibrateTimerRef.current);
    vibrateTimerRef.current = setInterval(() => {
      try {
        navigator.vibrate?.([400, 150, 400]);
      } catch {}
    }, 1300);
    try {
      navigator.vibrate?.([400, 150, 400]);
    } catch {}
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      try {
        new Notification("Istirahat selesai! ⏰", {
          body: "Buka aplikasi dan tekan Matikan untuk menghentikan alarm.",
        });
      } catch {}
    }
    setAlarming(true);
  }, []);

  useEffect(() => {
    if (!rest) return;
    const endsAt = Date.now() + rest.seconds * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRest(null);
        startAlarm();
      }
    };
    tick();
    const t = setInterval(tick, 300);
    return () => clearInterval(t);
  }, [rest, startAlarm]);

  // Pastikan bunyi & getar berhenti saat meninggalkan halaman.
  useEffect(() => {
    const gainRef = alarmGainRef;
    const timerRef = vibrateTimerRef;
    return () => {
      try {
        gainRef.current?.disconnect();
      } catch {}
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- Derivasi tampilan ----
  const { doneCount, volume } = useMemo(() => {
    let dc = 0;
    let vol = 0;
    for (const ex of data.exercises) {
      const s = state[ex.exercise.id];
      for (const slot of s.sets) {
        if (!slot.done) continue;
        dc += 1;
        if (exKind(ex.exercise) === "weighted") vol += slot.reps * s.weight;
      }
    }
    return { doneCount: dc, volume: Math.round(vol) };
  }, [state, data.exercises]);

  function setWeight(exId: string, delta: number) {
    dirty.current = true;
    setState((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], weight: Math.max(0, prev[exId].weight + delta) },
    }));
  }

  function setReps(exId: string, setIdx: number, delta: number) {
    dirty.current = true;
    setState((prev) => {
      const cur = prev[exId];
      const sets = cur.sets.map((s, i) =>
        i === setIdx ? { ...s, reps: Math.max(1, Math.min(999, s.reps + delta)) } : s,
      );
      return { ...prev, [exId]: { ...cur, sets } };
    });
  }

  function toggleSet(exId: string, setIdx: number, restSeconds: number, exName: string) {
    ensureAudio();
    stopAlarm();
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
    const cur = state[exId];
    const slot = cur.sets[setIdx];
    if (!slot.done) {
      // Harus berurutan: set N hanya bisa dicentang bila semua sebelumnya selesai.
      if (cur.sets.slice(0, setIdx).some((s) => !s.done)) {
        toast.info(`Selesaikan Set ${setIdx} dulu ya, biar teratur.`);
        return;
      }
    } else {
      // Hanya set terakhir yang selesai yang boleh dibatalkan (hindari bolong).
      if (cur.sets[setIdx + 1]?.done) {
        toast.info("Batalkan dari set paling akhir dulu.");
        return;
      }
    }
    const nowDone = !slot.done;
    dirty.current = true;
    setState((prev) => {
      const c = prev[exId];
      const sets = c.sets.map((s, i) => (i === setIdx ? { ...s, done: nowDone } : s));
      return { ...prev, [exId]: { ...c, sets } };
    });
    if (nowDone && restSeconds > 0) {
      restSeq.current += 1;
      setRest({ seq: restSeq.current, seconds: restSeconds, exName });
    }
  }

  async function finish() {
    if (doneCount === 0) {
      toast.info("Catat minimal satu set dulu ya.");
      return;
    }
    setFinishing(true);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    const res = await completeSession(data.session_id, collectSets(state));
    setFinishing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRest(null);
    stopAlarm();
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
            {doneCount} set selesai{syncing ? " · menyinkron…" : ""}
          </div>
        </div>
        <div style={{ font: "800 15px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
          {formatNumber(volume)} kg
        </div>
      </div>

      {/* exercises */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 20px 150px" }} className="no-scrollbar">
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
        {/* AI menyusun ulang latihan hari program INI saja (track record + kaidah pelatih). */}
        <AutoGenerateCard
          programDayId={data.program_day_id}
          date={data.session_date}
          dayLabel={data.day_label}
        />

        {data.exercises.map((ex) => {
          // Fallback untuk 1 frame pertama setelah swap (sebelum effect merge).
          const s = state[ex.exercise.id] ?? initForExercise(ex);
          const kind = exKind(ex.exercise);
          const unit = exUnit(ex.exercise);
          const firstUndone = s.sets.findIndex((x) => !x.done);
          const restLabel =
            ex.rest_seconds >= 60
              ? `${Math.round(ex.rest_seconds / 60 * 10) / 10} mnt`.replace(".", ",")
              : `${ex.rest_seconds} dtk`;
          // Jangkar beban: %1RM untuk gerakan berbeban, RIR (sisa rep sebelum
          // gagal) untuk semua latihan resistance. Kardio tak punya keduanya.
          const loadLabel =
            ex.target_intensity_low != null && ex.target_intensity_high != null
              ? ` · ${ex.target_intensity_low}-${ex.target_intensity_high}% 1RM`
              : "";
          const rirLabel =
            ex.target_rir_low != null && ex.target_rir_high != null
              ? ` · sisakan ${ex.target_rir_low}-${ex.target_rir_high} rep`
              : "";
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
                {/* Ganti gerakan slot ini (custom / rekomendasi AI) tanpa keluar dari sesi. */}
                <button
                  onClick={() => openSwap(ex)}
                  aria-label={`Ubah latihan ${ex.exercise.name}`}
                  style={{
                    font: "700 11px var(--font-archivo), sans-serif",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                    color: "var(--acc)",
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: "rgba(201,251,60,.1)",
                    border: "1px solid rgba(201,251,60,.24)",
                    whiteSpace: "nowrap",
                    flex: "none",
                    marginTop: 2,
                  }}
                >
                  Ubah
                </button>
              </div>
              <div style={{ font: "600 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginBottom: ex.swapped_from ? 6 : 12 }}>
                {ex.target_sets} set × {ex.target_rep_low}-{ex.target_rep_high} {unit}{loadLabel}{rirLabel} · istirahat {restLabel} · terakhir {ex.last_label}
              </div>
              {ex.swapped_from && (
                <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "#ff9a5c", marginBottom: 12 }}>
                  {ex.swap_source === "ai" ? "✨ Rekomendasi AI" : "Custom"} — pengganti sementara untuk{" "}
                  <s>{ex.swapped_from}</s> (hanya hari ini)
                </div>
              )}

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

              {kind === "weighted" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <button onClick={() => setWeight(ex.exercise.id, -2.5)} style={stepBtn} aria-label="Kurangi beban">
                    −
                  </button>
                  <div style={{ textAlign: "center", minWidth: 70 }}>
                    <span style={{ font: "900 22px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                      {s.weight}
                    </span>
                    <span style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--dim)" }}> kg</span>
                  </div>
                  <button onClick={() => setWeight(ex.exercise.id, 2.5)} style={stepBtn} aria-label="Tambah beban">
                    +
                  </button>
                  <div style={{ flex: 1, textAlign: "right", font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                    selesaikan set berurutan
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {s.sets.map((slot, i) => {
                  const locked = !slot.done && firstUndone !== -1 && i > firstUndone;
                  const totalKg = Math.round(slot.reps * s.weight * 10) / 10;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        opacity: locked ? 0.45 : 1,
                        transition: "opacity .15s",
                      }}
                    >
                      <button
                        onClick={() => toggleSet(ex.exercise.id, i, ex.rest_seconds, ex.exercise.name)}
                        disabled={locked}
                        style={{
                          padding: "9px 0",
                          width: 74,
                          borderRadius: 11,
                          font: "700 13px var(--font-archivo), sans-serif",
                          background: slot.done ? "var(--lime)" : "var(--raised)",
                          color: slot.done ? "#10130a" : "var(--dim)",
                          border: slot.done ? "none" : "1px solid var(--line2)",
                          flex: "none",
                        }}
                      >
                        {slot.done ? "✓ " : locked ? "🔒 " : ""}Set {i + 1}
                      </button>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          background: "var(--raised)",
                          border: "1px solid var(--line2)",
                          borderRadius: 11,
                          padding: 2,
                          flex: "none",
                        }}
                      >
                        <button
                          onClick={() => setReps(ex.exercise.id, i, -1)}
                          disabled={locked}
                          style={repBtn}
                          aria-label={`Kurangi ${unit}`}
                        >
                          −
                        </button>
                        <span style={{ font: "800 13px var(--font-archivo), sans-serif", color: "var(--ink)", minWidth: 24, textAlign: "center" }}>
                          {slot.reps}
                        </span>
                        <button
                          onClick={() => setReps(ex.exercise.id, i, 1)}
                          disabled={locked}
                          style={repBtn}
                          aria-label={`Tambah ${unit}`}
                        >
                          +
                        </button>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          textAlign: "right",
                          font: "600 12px var(--font-jakarta), sans-serif",
                          color: slot.done ? "var(--acc)" : "var(--dim)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {kind === "weighted"
                          ? s.weight > 0
                            ? `${slot.reps} × ${s.weight} kg = ${formatNumber(totalKg)} kg`
                            : `${slot.reps} ${unit}`
                          : kind === "cardio"
                            ? `${slot.reps} menit`
                            : `${slot.reps} ${unit === "dtk" ? "dtk" : "reps"}`}
                      </div>
                    </div>
                  );
                })}

                {ex.exercise.video_url && (
                  <button
                    onClick={() => setVideoOf(ex.exercise)}
                    aria-label="Lihat video teknik"
                    style={{
                      alignSelf: "flex-end",
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

      {/* rest timer + finish */}
      <div style={{ padding: "10px 20px 26px", background: "linear-gradient(0deg,var(--phone-bg) 60%,transparent)" }}>
        {alarming && (
          <div
            style={{
              borderRadius: 16,
              border: "1.5px solid rgba(255,59,48,.55)",
              background: "rgba(255,59,48,.14)",
              padding: "12px 14px",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 11,
            }}
          >
            {/* hanya ikon yang berdenyut — tombol Matikan harus diam agar mudah ditekan */}
            <span style={{ fontSize: 20, animation: "pk-pulse 1.1s ease-in-out infinite", display: "inline-block" }}>⏰</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "800 14.5px var(--font-archivo), sans-serif", color: "#ff5b52" }}>
                Istirahat selesai!
              </div>
              <div style={{ font: "600 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                Gas set berikutnya 💪
              </div>
            </div>
            <button
              onClick={stopAlarm}
              style={{
                flex: "none",
                padding: "11px 18px",
                borderRadius: 12,
                background: "#ff3b30",
                color: "#fff",
                font: "800 13.5px var(--font-archivo), sans-serif",
                boxShadow: "0 8px 20px -8px rgba(255,59,48,.7)",
              }}
            >
              Matikan
            </button>
          </div>
        )}
        {rest && (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(201,251,60,.25)",
              background: "var(--surface)",
              padding: "10px 14px",
              marginBottom: 10,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${Math.min(100, (remaining / rest.seconds) * 100)}%`,
                background: "rgba(201,251,60,.08)",
                transition: "width .3s linear",
              }}
            />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "800 16px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
                  {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
                </div>
                <div style={{ font: "600 11px var(--font-jakarta), sans-serif", color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Istirahat · {rest.exName}
                </div>
              </div>
              <button
                onClick={() => setRest((r) => (r ? { ...r, seconds: remaining + 30 } : r))}
                style={{
                  padding: "7px 11px",
                  borderRadius: 10,
                  background: "var(--raised)",
                  border: "1px solid var(--line2)",
                  color: "var(--ink2)",
                  font: "700 12px var(--font-archivo), sans-serif",
                  flex: "none",
                }}
              >
                +30d
              </button>
              <button
                onClick={() => setRest(null)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 10,
                  background: "var(--raised)",
                  border: "1px solid var(--line2)",
                  color: "var(--dim)",
                  font: "700 12px var(--font-archivo), sans-serif",
                  flex: "none",
                }}
              >
                Lewati
              </button>
            </div>
          </div>
        )}
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

      {/* Sheet ganti latihan — kandidat satu kategori; "Lihat" membuka video &
          langkah teknik (ExerciseSheet) sebelum memutuskan "Pakai". */}
      {swap && (
        <div
          onClick={() => setSwap(null)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 80,
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
              position: "relative",
              width: "100%",
              maxHeight: "82%",
              overflowY: "auto",
              background: "var(--sheet)",
              borderRadius: "28px 28px 0 0",
              borderTop: "1px solid rgba(201,251,60,.18)",
              padding: "18px 20px 28px",
              animation: "pk-up .3s both",
              opacity: swap.applying ? 0.6 : 1,
            }}
            className="no-scrollbar"
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
              <h2 style={{ font: "900 19px var(--font-archivo), sans-serif", color: "var(--ink)", margin: 0, flex: 1 }}>
                Ubah: {swap.originalName}
              </h2>
              <button
                onClick={() => setSwap(null)}
                aria-label="Tutup"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "var(--surface)",
                  border: "1px solid var(--line2)",
                  color: "var(--dim)",
                  font: "700 14px var(--font-archivo), sans-serif",
                  flex: "none",
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ font: "500 12.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", margin: "0 0 14px" }}>
              Berlaku {backdateLabel(data.session_date)} saja — program asli tidak berubah.
            </p>

            {/* Slot ini sedang di-override → tawarkan kembali ke gerakan asli. */}
            {swap.swappedFrom && (
              <button
                onClick={restoreSwap}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 13,
                  background: "var(--raised)",
                  border: "1px solid var(--line2)",
                  color: "var(--ink2)",
                  font: "700 13px var(--font-archivo), sans-serif",
                  marginBottom: 10,
                }}
              >
                ↩ Kembalikan ke {swap.swappedFrom}
              </button>
            )}

            <button
              onClick={runSwapAI}
              disabled={swap.aiLoading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 13,
                background: "rgba(201,251,60,.12)",
                border: "1px solid rgba(201,251,60,.3)",
                color: "var(--acc)",
                font: "700 13px var(--font-archivo), sans-serif",
                opacity: swap.aiLoading ? 0.6 : 1,
                marginBottom: 10,
              }}
            >
              {swap.aiLoading
                ? "AI mempelajari track record kamu…"
                : "✨ Minta rekomendasi AI (berdasarkan track record)"}
            </button>

            {swap.ai && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {swap.ai.summary && (
                  <div style={{ font: "500 12.5px/1.55 var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                    {swap.ai.summary}
                  </div>
                )}
                {swap.ai.recommendations.map((r) => (
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
                    <button style={swapGhostBtn} onClick={() => setVideoOf(r.exercise)}>
                      Lihat
                    </button>
                    <button
                      style={swapUseBtn}
                      onClick={() => applySwap(r.exercise_id, "ai", r.reason)}
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
                margin: "4px 0 8px",
              }}
            >
              Atau pilih sendiri (kategori sama)
            </div>
            {swap.candidates === null ? (
              <div style={{ font: "500 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                Memuat kandidat…
              </div>
            ) : swap.candidates.length === 0 ? (
              <div style={{ font: "500 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                Tidak ada gerakan lain yang aman untuk kategori ini.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {swap.candidates.map((c) => (
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
                        {EQUIPMENT_LABEL[c.equipment] ?? c.equipment} · {LEVEL_LABEL[c.level] ?? c.level}
                      </div>
                    </div>
                    <button style={swapGhostBtn} onClick={() => setVideoOf(c)}>
                      Lihat
                    </button>
                    <button style={swapUseBtn} onClick={() => applySwap(c.id, "custom")}>
                      Pakai
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

const swapGhostBtn: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 10,
  background: "var(--surface)",
  border: "1px solid var(--line2)",
  color: "var(--dim)",
  font: "700 12px var(--font-archivo), sans-serif",
  flex: "none",
};

const swapUseBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  background: "rgba(201,251,60,.12)",
  border: "1px solid rgba(201,251,60,.3)",
  color: "var(--acc)",
  font: "700 12px var(--font-archivo), sans-serif",
  flex: "none",
};

const stepBtn: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 11,
  background: "var(--raised)",
  font: "600 20px var(--font-archivo), sans-serif",
  color: "var(--ink2)",
};

const repBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "transparent",
  font: "600 16px var(--font-archivo), sans-serif",
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
