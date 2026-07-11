"use server";

// ── Penggantian latihan sementara (custom & rekomendasi AI) ─────────────
// User bisa mengganti gerakan pada slot program dengan gerakan lain dari bank
// SELAMA kategorinya sama (movement_pattern) — berlaku hanya untuk satu
// tanggal, program asli tidak berubah, dan semua penggantian tercatat sebagai
// riwayat per tanggal di tabel `exercise_overrides`.

import {
  ALL_QUOTA_EXHAUSTED_MESSAGE,
  COACH_MODELS,
  CoachModel,
  DEFAULT_COACH_MODEL,
} from "@/constants/coach-constant";
import { GOAL_LABEL, LEVEL_LABEL } from "@/constants/labels";
import { createAI } from "@/features/ai/instance";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { FitnessProfile } from "@/types/profile";
import { Exercise } from "@/types/program";
import { Type } from "@google/genai";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import {
  allowedEquipment,
  isHighImpact,
  isPregnancyUnsafe,
} from "./generator";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type OverrideInfo = {
  id: string;
  source: "custom" | "ai";
  reason: string | null;
  override_date: string;
  replacement: Exercise;
};

export type DayDetailExercise = {
  program_exercise_id: string;
  order_index: number;
  target_sets: number;
  target_rep_low: number;
  target_rep_high: number;
  rest_seconds: number;
  exercise: Exercise;
  /** Override aktif pada tanggal yang diminta (bila ada). */
  override: OverrideInfo | null;
};

export type DayDetail = {
  day_id: string;
  program_id: string;
  label: string;
  focus: string | null;
  exercises: DayDetailExercise[];
};

/** Detail satu hari program + override yang berlaku pada tanggal tertentu. */
export async function getDayDetail(
  dayId: string,
  date: string,
): Promise<DayDetail | null> {
  if (!DATE_RE.test(date)) return null;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: day } = await supabase
    .from("program_days")
    .select(
      "id, program_id, label, focus, exercises:program_exercises(id, order_index, target_sets, target_rep_low, target_rep_high, rest_seconds, exercise:exercises!program_exercises_exercise_id_fkey(*))",
    )
    .eq("id", dayId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!day) return null;

  const rows = ((day.exercises ?? []) as unknown as {
    id: string;
    order_index: number;
    target_sets: number;
    target_rep_low: number;
    target_rep_high: number;
    rest_seconds: number | null;
    exercise: Exercise;
  }[]).sort((a, b) => a.order_index - b.order_index);

  const peIds = rows.map((r) => r.id);
  const { data: overrides } = peIds.length
    ? await supabase
        .from("exercise_overrides")
        .select("id, program_exercise_id, source, reason, override_date, replacement:exercises(*)")
        .eq("user_id", user.id)
        .eq("override_date", date)
        .in("program_exercise_id", peIds)
    : { data: [] };

  const byPe = new Map(
    (overrides ?? []).map((o) => [
      o.program_exercise_id as string,
      {
        id: o.id as string,
        source: o.source as "custom" | "ai",
        reason: (o.reason as string) ?? null,
        override_date: o.override_date as string,
        replacement: o.replacement as unknown as Exercise,
      },
    ]),
  );

  return {
    day_id: day.id,
    program_id: day.program_id,
    label: day.label,
    focus: day.focus,
    exercises: rows.map((r) => ({
      program_exercise_id: r.id,
      order_index: r.order_index,
      target_sets: r.target_sets,
      target_rep_low: r.target_rep_low,
      target_rep_high: r.target_rep_high,
      rest_seconds: r.rest_seconds ?? 90,
      exercise: r.exercise,
      override: byPe.get(r.id) ?? null,
    })),
  };
}

// Muat slot program + profil + kandidat pengganti yang AMAN untuk user ini.
// Kandidat dibatasi kategori yang sama (movement_pattern) — inilah penegakan
// "custom tetap berdasarkan kategori program".
async function loadSlotAndCandidates(programExerciseId: string): Promise<{
  error?: string;
  original?: Exercise;
  fitness?: FitnessProfile;
  candidates?: Exercise[];
}> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const [{ data: pe }, { data: fitness }] = await Promise.all([
    supabase
      .from("program_exercises")
      .select("id, exercise:exercises!program_exercises_exercise_id_fkey(*)")
      .eq("id", programExerciseId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("fitness_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<FitnessProfile>(),
  ]);

  const original = pe?.exercise as unknown as Exercise | undefined;
  if (!original) return { error: "Slot latihan tidak ditemukan." };

  const { data: pool } = await supabase
    .from("exercises")
    .select("*")
    .eq("movement_pattern", original.movement_pattern)
    .neq("slug", original.slug)
    .returns<Exercise[]>();

  const injuries = fitness?.injuries ?? [];
  const allowed = allowedEquipment(fitness?.equipment ?? "rumah_tanpa_alat");
  const isFertility = fitness?.goal === "kesuburan";
  const lowImpact =
    isFertility ||
    injuries.includes("lutut") ||
    injuries.includes("pergelangan_kaki");

  const candidates = (pool ?? []).filter(
    (e) =>
      allowed.has(e.equipment) &&
      !e.injury_cautions.some((c) => injuries.includes(c)) &&
      !(lowImpact && isHighImpact(e)) &&
      !(isFertility && isPregnancyUnsafe(e)),
  );

  return { original, fitness: fitness ?? undefined, candidates };
}

/** Kandidat pengganti untuk sebuah slot — kategori sama, aman untuk profil user. */
export async function getSwapCandidates(programExerciseId: string): Promise<{
  error?: string;
  original?: Exercise;
  candidates?: Exercise[];
}> {
  const res = await loadSlotAndCandidates(programExerciseId);
  if (res.error) return { error: res.error };

  const levelOrder: Record<string, number> = { pemula: 1, menengah: 2, mahir: 3 };
  const userLevel = levelOrder[res.fitness?.experience_level ?? "pemula"];
  const sorted = (res.candidates ?? [])
    // Jangan tawarkan gerakan 2 level di atas kemampuan (konsisten generator).
    .filter((e) => levelOrder[e.level] - userLevel < 2)
    .sort(
      (a, b) =>
        Math.abs(levelOrder[a.level] - userLevel) -
          Math.abs(levelOrder[b.level] - userLevel) ||
        a.name.localeCompare(b.name),
    );

  return { original: res.original, candidates: sorted };
}

/**
 * Pasang penggantian sementara untuk satu tanggal. Kategori pengganti
 * divalidasi ulang di server; upsert per (slot, tanggal) — memilih ulang di
 * tanggal yang sama menimpa pilihan sebelumnya (riwayat tetap per tanggal).
 */
export async function setExerciseOverride(input: {
  programExerciseId: string;
  replacementExerciseId: string;
  date: string;
  source: "custom" | "ai";
  reason?: string;
}): Promise<{ error?: string }> {
  if (!DATE_RE.test(input.date)) return { error: "Tanggal tidak valid." };
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const [{ data: pe }, { data: replacement }] = await Promise.all([
    supabase
      .from("program_exercises")
      .select("id, exercise:exercises!program_exercises_exercise_id_fkey(movement_pattern)")
      .eq("id", input.programExerciseId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("exercises")
      .select("id, movement_pattern")
      .eq("id", input.replacementExerciseId)
      .maybeSingle(),
  ]);

  const originalPattern = (
    pe?.exercise as unknown as { movement_pattern: string } | null
  )?.movement_pattern;
  if (!originalPattern) return { error: "Slot latihan tidak ditemukan." };
  if (!replacement) return { error: "Gerakan pengganti tidak ditemukan." };
  if (replacement.movement_pattern !== originalPattern) {
    return {
      error: "Gerakan pengganti harus satu kategori dengan latihan aslinya.",
    };
  }

  const { error } = await supabase.from("exercise_overrides").upsert(
    {
      user_id: user.id,
      program_exercise_id: input.programExerciseId,
      replacement_exercise_id: input.replacementExerciseId,
      override_date: input.date,
      source: input.source,
      reason: input.reason ?? null,
    },
    { onConflict: "program_exercise_id,override_date" },
  );
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

/** Batalkan penggantian sebuah slot pada tanggal tertentu (dipakai dari sesi). */
export async function removeExerciseOverrideForDate(
  programExerciseId: string,
  date: string,
): Promise<{ error?: string }> {
  if (!DATE_RE.test(date)) return { error: "Tanggal tidak valid." };
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const { error } = await supabase
    .from("exercise_overrides")
    .delete()
    .eq("program_exercise_id", programExerciseId)
    .eq("override_date", date)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

/** Batalkan penggantian (kembali ke latihan asli program) untuk tanggal itu. */
export async function removeExerciseOverride(
  overrideId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const { error } = await supabase
    .from("exercise_overrides")
    .delete()
    .eq("id", overrideId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export type OverrideHistoryItem = {
  id: string;
  override_date: string;
  source: "custom" | "ai";
  reason: string | null;
  day_label: string;
  original_name: string;
  replacement_name: string;
};

/** Riwayat penggantian (terbaru dulu), per tanggal yang tersimpan. */
export async function getOverrideHistory(
  dayId?: string,
): Promise<OverrideHistoryItem[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from("exercise_overrides")
    .select(
      "id, override_date, source, reason, replacement:exercises(name), program_exercise:program_exercises(program_day_id, exercise:exercises!program_exercises_exercise_id_fkey(name), day:program_days(label))",
    )
    .eq("user_id", user.id)
    .order("override_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (dayId) {
    // Filter per hari program dilakukan setelah fetch (relasi bersarang).
    query = query.limit(60);
  }

  const { data } = await query;
  const items = (data ?? []).map((o) => {
    const pe = o.program_exercise as unknown as {
      program_day_id: string;
      exercise: { name: string } | null;
      day: { label: string } | null;
    } | null;
    return {
      id: o.id as string,
      override_date: o.override_date as string,
      source: o.source as "custom" | "ai",
      reason: (o.reason as string) ?? null,
      day_label: pe?.day?.label ?? "",
      day_id: pe?.program_day_id ?? "",
      original_name: pe?.exercise?.name ?? "",
      replacement_name:
        (o.replacement as unknown as { name: string } | null)?.name ?? "",
    };
  });

  return (dayId ? items.filter((i) => i.day_id === dayId) : items)
    .slice(0, 30)
    .map(({ day_id: _unused, ...rest }) => {
      void _unused;
      return rest;
    });
}

// ── Rekomendasi AI ──────────────────────────────────────────────────────

export type AIRecommendation = {
  exercise_id: string;
  slug: string;
  name: string;
  reason: string;
  /** Data lengkap gerakan — untuk preview video & langkah teknik sebelum dipakai. */
  exercise: Exercise;
};

const RECOMMEND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "1-2 kalimat Bahasa Indonesia: apa yang terbaca dari track record user & arah rekomendasinya.",
    },
    recommendations: {
      type: Type.ARRAY,
      description:
        "1-3 gerakan pengganti terbaik, urut dari yang paling direkomendasikan. slug WAJIB dipilih dari daftar kandidat.",
      items: {
        type: Type.OBJECT,
        properties: {
          slug: { type: Type.STRING, description: "Slug persis dari daftar kandidat." },
          reason: {
            type: Type.STRING,
            description:
              "Alasan singkat berbasis track record user (variasi/plateau/kelemahan), Bahasa Indonesia.",
          },
        },
        required: ["slug", "reason"],
      },
    },
  },
  required: ["summary", "recommendations"],
};

function isQuotaError(error: unknown): boolean {
  const err = error as { status?: number | string; code?: number; message?: string };
  const message = (err?.message ?? "").toLowerCase();
  return (
    err?.status === 429 ||
    err?.status === "RESOURCE_EXHAUSTED" ||
    err?.code === 429 ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("429")
  );
}

/**
 * Rekomendasi gerakan pengganti oleh AI. Sebelum merekomendasikan, agent
 * MEMPELAJARI track record user: sesi-sesi selesai terakhir, riwayat set
 * (beban×rep, tren progres) untuk kategori ini, dan profil/tujuan — lalu
 * memilih 1-3 kandidat dari bank yang kategorinya sama & aman untuk user.
 */
export async function recommendExercise(input: {
  programExerciseId: string;
  model?: CoachModel;
}): Promise<{ error?: string; summary?: string; recommendations?: AIRecommendation[] }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const slot = await loadSlotAndCandidates(input.programExerciseId);
  if (slot.error || !slot.original) {
    return { error: slot.error ?? "Slot latihan tidak ditemukan." };
  }
  const candidates = slot.candidates ?? [];
  if (candidates.length === 0) {
    return { error: "Tidak ada kandidat pengganti yang aman untuk kategori ini." };
  }

  // ── Track record: sesi selesai terakhir + riwayat set kategori ini ────
  const candidateIds = [slot.original.id, ...candidates.map((c) => c.id)];
  const [{ data: sessions }, { data: patternLogs }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("completed_at, total_volume, program_day:program_days(label)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(12),
    supabase
      .from("set_logs")
      .select("exercise_id, weight_kg, reps, created_at, exercise:exercises!inner(name, slug)")
      .eq("user_id", user.id)
      .in("exercise_id", candidateIds)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  const sessionLines = (sessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => {
      const label =
        (s.program_day as unknown as { label?: string } | null)?.label ?? "Sesi";
      return `- ${format(new Date(s.completed_at as string), "yyyy-MM-dd")}: ${label}, volume ${Math.round(Number(s.total_volume ?? 0))} kg`;
    })
    .join("\n");

  // Ringkas riwayat per gerakan: jumlah set tercatat, beban terberat, terakhir kali.
  const byExercise = new Map<
    string,
    { name: string; sets: number; topWeight: number; topReps: number; last: string }
  >();
  for (const l of patternLogs ?? []) {
    const ex = l.exercise as unknown as { name: string; slug: string };
    const cur = byExercise.get(ex.slug) ?? {
      name: ex.name,
      sets: 0,
      topWeight: 0,
      topReps: 0,
      last: format(new Date(l.created_at as string), "yyyy-MM-dd"),
    };
    cur.sets += 1;
    cur.topWeight = Math.max(cur.topWeight, Number(l.weight_kg) || 0);
    cur.topReps = Math.max(cur.topReps, l.reps ?? 0);
    byExercise.set(ex.slug, cur);
  }
  const historyLines =
    [...byExercise.entries()]
      .map(
        ([slug, h]) =>
          `- ${h.name} (${slug}): ${h.sets} set tercatat, terberat ${h.topWeight} kg × ${h.topReps} rep, terakhir ${h.last}`,
      )
      .join("\n") || "- belum ada riwayat set untuk kategori ini";

  const candidateLines = candidates
    .map(
      (c) =>
        `- ${c.slug} | ${c.name} | alat: ${c.equipment} | level: ${c.level} | otot: ${c.muscle_group}`,
    )
    .join("\n");

  const fitness = slot.fitness;
  const prompt = `Kamu personal trainer bersertifikat (NSCA-CPT) di aplikasi fitness Indonesia.
Tugas: pelajari dulu TRACK RECORD latihan user di bawah, lalu rekomendasikan 1-3 gerakan PENGGANTI untuk satu slot program hari ini. Pengganti hanya berlaku sementara (satu tanggal), program asli tidak berubah.

Profil user:
- Tujuan: ${fitness?.goal ? (GOAL_LABEL[fitness.goal] ?? fitness.goal) : "kebugaran umum"}
- Level: ${fitness?.experience_level ? (LEVEL_LABEL[fitness.experience_level] ?? fitness.experience_level) : "pemula"}
- Cedera/keluhan: ${(fitness?.injuries ?? []).join(", ") || "tidak ada"}

Slot yang akan diganti:
- Gerakan asli: ${slot.original.name} (${slot.original.slug}), kategori: ${slot.original.movement_pattern}

Track record sesi selesai terakhir:
${sessionLines || "- belum ada sesi selesai"}

Riwayat set user untuk gerakan kategori ini:
${historyLines}

KANDIDAT pengganti (kategori sama, sudah difilter aman untuk alat, cedera & tujuan user — slug WAJIB dipilih dari daftar ini):
${candidateLines}

Aturan:
- Pilih berdasarkan track record: kalau gerakan asli sudah sering/stagnan → beri variasi baru; kalau ada gerakan kandidat yang belum pernah dicoba dan levelnya cocok → pertimbangkan; kalau user sering skip kategori ini → pilih yang paling sederhana.
- Jangan merekomendasikan gerakan level jauh di atas kemampuan user.
- reason singkat, spesifik ke data user (bukan generik), Bahasa Indonesia.`;

  const ai = createAI();
  const preferred = input.model ?? DEFAULT_COACH_MODEL;
  const models = [preferred, ...COACH_MODELS.filter((m) => m !== preferred)];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: RECOMMEND_SCHEMA,
        },
      });
      const parsed = JSON.parse(response.text ?? "") as {
        summary: string;
        recommendations: { slug: string; reason: string }[];
      };
      const bySlug = new Map(candidates.map((c) => [c.slug, c]));
      const recs = (parsed.recommendations ?? [])
        .map((r) => {
          const ex = bySlug.get(r.slug);
          return ex
            ? {
                exercise_id: ex.id,
                slug: ex.slug,
                name: ex.name,
                reason: String(r.reason ?? ""),
                exercise: ex,
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, 3) as AIRecommendation[];
      if (recs.length === 0) throw new Error("AI tidak memilih kandidat valid.");
      return { summary: String(parsed.summary ?? ""), recommendations: recs };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (isQuotaError(lastError)) return { error: ALL_QUOTA_EXHAUSTED_MESSAGE };
  return { error: "Gagal menyusun rekomendasi. Coba lagi ya." };
}
