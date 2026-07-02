import { ExperienceLevel } from "@/types/profile";

// Jendela auto-adjust yang dijanjikan di halaman Program: 4–6 minggu.
const MIN_WEEKS = 4;
const MAX_WEEKS = 6;
// Minimal 70% sesi terjadwal selesai sebelum level dinaikkan (kepatuhan).
const MIN_ADHERENCE = 0.7;
// Tren volume dianggap naik bila rata-rata 3 sesi terakhir ≥ +5% dari 3 sesi awal.
const VOLUME_GAIN = 1.05;

const NEXT_LEVEL: Partial<Record<ExperienceLevel, ExperienceLevel>> = {
  pemula: "menengah",
  menengah: "mahir",
};

export type ProgressionSession = {
  completed_at: string;
  total_volume: number;
};

export type ProgressionDecision =
  | { action: "promote"; next_level: ExperienceLevel; reason: string }
  | { action: "wait"; reason: string };

export type ProgressionInput = {
  level: ExperienceLevel;
  /** ISO timestamp saat program aktif dibuat. */
  program_created_at: string;
  frequency_per_week: number;
  /** Sesi SELESAI milik program aktif, urut dari yang paling lama. */
  sessions: ProgressionSession[];
  /** Injeksi waktu untuk pengujian/simulasi; default sekarang. */
  now?: Date;
};

export type ProgressionStatus = {
  decision: ProgressionDecision;
  weeks_elapsed: number;
  sessions_done: number;
  sessions_expected: number;
};

/**
 * Keputusan deterministik "program menyesuaikan otomatis tiap 4–6 minggu":
 * - < 4 minggu → tunggu (program masih fase adaptasi).
 * - 4–6 minggu + kepatuhan ≥ 70% + volume naik → naik level.
 * - ≥ 6 minggu + kepatuhan ≥ 70% → naik level walau volume datar
 *   (plateau justru tanda butuh stimulus baru).
 * Pure function (tanpa DB/AI), sejalan dengan suggestNextSet di overload.ts.
 */
export function evaluateProgression(input: ProgressionInput): ProgressionStatus {
  const now = input.now ?? new Date();
  const createdAt = new Date(input.program_created_at).getTime();
  const weeksElapsed = Math.max(0, (now.getTime() - createdAt) / (7 * 86_400_000));

  const sessions = input.sessions;
  // Ekspektasi sesi dibatasi jendela 6 minggu supaya user yang sempat vakum
  // tidak "berhutang" sesi tanpa batas.
  const expected = Math.max(
    1,
    Math.round(input.frequency_per_week * Math.min(weeksElapsed, MAX_WEEKS)),
  );

  const base = {
    weeks_elapsed: Math.round(weeksElapsed * 10) / 10,
    sessions_done: sessions.length,
    sessions_expected: expected,
  };

  const nextLevel = NEXT_LEVEL[input.level];
  if (!nextLevel) {
    return {
      ...base,
      decision: {
        action: "wait",
        reason:
          "Kamu sudah di level tertinggi — progres berlanjut lewat kenaikan beban tiap sesi.",
      },
    };
  }

  if (weeksElapsed < MIN_WEEKS) {
    return {
      ...base,
      decision: {
        action: "wait",
        reason: `Program berjalan ${base.weeks_elapsed} minggu — penyesuaian dievaluasi mulai minggu ke-${MIN_WEEKS}.`,
      },
    };
  }

  const adherence = sessions.length / expected;
  if (adherence < MIN_ADHERENCE) {
    return {
      ...base,
      decision: {
        action: "wait",
        reason: `Baru ${sessions.length} dari ~${expected} sesi yang selesai — konsistenkan dulu latihannya sebelum naik level.`,
      },
    };
  }

  // Tren kekuatan dari total_volume sesi (sudah tercatat di workout_sessions).
  // User full bodyweight punya volume 0 (beban 0 kg) — lewati cek tren untuk
  // mereka dan andalkan kepatuhan saja.
  const first3 = sessions.slice(0, 3);
  const last3 = sessions.slice(-3);
  const avg = (xs: ProgressionSession[]) =>
    xs.reduce((a, s) => a + Number(s.total_volume), 0) / Math.max(1, xs.length);
  const firstAvg = avg(first3);
  const lastAvg = avg(last3);
  const bodyweightOnly = firstAvg === 0 && lastAvg === 0;
  const volumeUp = bodyweightOnly || lastAvg >= firstAvg * VOLUME_GAIN;

  if (volumeUp) {
    return {
      ...base,
      decision: {
        action: "promote",
        next_level: nextLevel,
        reason: bodyweightOnly
          ? `Konsisten ${sessions.length} sesi dalam ${base.weeks_elapsed} minggu — siap naik level.`
          : `Volume latihanmu naik ${Math.round((lastAvg / Math.max(1, firstAvg) - 1) * 100)}% sejak awal program — kamu makin kuat.`,
      },
    };
  }

  if (weeksElapsed >= MAX_WEEKS) {
    return {
      ...base,
      decision: {
        action: "promote",
        next_level: nextLevel,
        reason: `Sudah ${base.weeks_elapsed} minggu konsisten — saatnya stimulus baru biar tidak mentok.`,
      },
    };
  }

  return {
    ...base,
    decision: {
      action: "wait",
      reason:
        "Kepatuhan bagus, tapi volume masih datar — kejar saran beban tiap sesi; dievaluasi lagi maksimal minggu ke-6.",
    },
  };
}
