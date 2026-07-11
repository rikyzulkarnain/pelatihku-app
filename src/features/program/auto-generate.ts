"use server";

// ── Generate Latihan Otomatis (per hari program, dipanggil dari sesi) ────
// Mengganti latihan SATU hari program lewat AI yang berperan sebagai personal
// trainer: mempelajari track record (sesi & riwayat set), menghormati
// profil/cedera/tujuan (kaidah NSCA/ACSM/ACOG sudah tertanam di filter
// kandidat), dan menjamin tidak ada gerakan duplikat dalam hari itu.
// Dua mode penerapan: "today" (override sementara pada tanggal sesi, tercatat
// di riwayat per tanggal) atau "permanent" (hari program diubah selamanya —
// bisa di-generate ulang kapan pun). Pilihan alat: "mixed" (sesuai profil)
// atau "bodyweight" saja.

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

export type AutoGenerateChange = {
  day_label: string;
  from: string;
  to: string;
  reason: string;
};

type Slot = {
  id: string;
  day_label: string;
  order_index: number;
  current: Exercise;
  /** Gerakan asli (null bila belum pernah diubah permanen). */
  baseline_exercise_id: string | null;
  candidates: Exercise[];
};

const LEVEL_ORDER: Record<string, number> = { pemula: 1, menengah: 2, mahir: 3 };

// Pesan ramah bila kolom baseline belum ada (migrasi 019 belum dijalankan).
function friendlyMigrationError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("baseline_exercise_id") || m.includes("could not find") || m.includes("does not exist")) {
    return "Database belum sinkron: jalankan migrasi 019-program-baseline.sql di Supabase SQL editor agar penggantian permanen bisa dikembalikan.";
  }
  return message;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "1-2 kalimat Bahasa Indonesia: apa yang terbaca dari track record & arah penyusunan latihan baru.",
    },
    picks: {
      type: Type.ARRAY,
      description:
        "Satu pilihan per slot. slug WAJIB dari daftar kandidat slot tsb (boleh slug gerakan saat ini bila memang terbaik).",
      items: {
        type: Type.OBJECT,
        properties: {
          slot_id: { type: Type.STRING },
          slug: { type: Type.STRING },
          reason: {
            type: Type.STRING,
            description: "Alasan singkat berbasis track record/tujuan, Bahasa Indonesia.",
          },
        },
        required: ["slot_id", "slug", "reason"],
      },
    },
  },
  required: ["summary", "picks"],
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

export async function autoGenerateExercises(input: {
  /** Hari program yang di-generate (hanya latihan hari ini yang diganti). */
  programDayId: string;
  /** Tanggal sesi (yyyy-MM-dd) — dipakai untuk override mode "today". */
  date: string;
  /** "today" = override sementara pada tanggal sesi; "permanent" = hari program diubah selamanya. */
  apply: "today" | "permanent";
  /** "mixed" = sesuai profil; "all" = semua alat & mesin; "bodyweight" = tanpa alat. */
  equipmentMode: "mixed" | "all" | "bodyweight";
  model?: CoachModel;
}): Promise<{ error?: string; summary?: string; changes?: AutoGenerateChange[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Tanggal tidak valid." };
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  // ── Muat program aktif + profil + bank latihan + track record ─────────
  const [{ data: program, error: programError }, { data: fitness }, { data: pool }] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, goal, days:program_days(id, label, day_index, exercises:program_exercises(id, order_index, baseline_exercise_id, exercise:exercises(*)))",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fitness_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<FitnessProfile>(),
    supabase.from("exercises").select("*").returns<Exercise[]>(),
  ]);

  if (programError) return { error: friendlyMigrationError(programError.message) };
  if (!program) return { error: "Belum ada program aktif." };
  if (!pool || pool.length === 0) return { error: "Bank latihan kosong." };

  const [{ data: sessions }, { data: logs }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("completed_at, total_volume, program_day:program_days(label)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(12),
    supabase
      .from("set_logs")
      .select("weight_kg, reps, created_at, exercise:exercises!inner(slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  // Ringkasan pemakaian per gerakan (dipakai AI menilai variasi/stagnasi).
  const usage = new Map<string, { sets: number; topWeight: number; last: string }>();
  for (const l of logs ?? []) {
    const slug = (l.exercise as unknown as { slug: string }).slug;
    const cur = usage.get(slug) ?? {
      sets: 0,
      topWeight: 0,
      last: format(new Date(l.created_at as string), "yyyy-MM-dd"),
    };
    cur.sets += 1;
    cur.topWeight = Math.max(cur.topWeight, Number(l.weight_kg) || 0);
    usage.set(slug, cur);
  }
  const usageLabel = (slug: string) => {
    const u = usage.get(slug);
    return u
      ? `${u.sets} set tercatat, terberat ${u.topWeight} kg, terakhir ${u.last}`
      : "belum pernah dicoba";
  };

  // ── Filter keamanan kandidat (kaidah pakar sudah tertanam di sini) ────
  const injuries = fitness?.injuries ?? [];
  const isFertility = program.goal === "kesuburan";
  const lowImpact =
    isFertility ||
    injuries.includes("lutut") ||
    injuries.includes("pergelangan_kaki");
  const allowed =
    input.equipmentMode === "bodyweight"
      ? new Set<string>(["bodyweight"])
      : input.equipmentMode === "all"
        ? // Semua alat & mesin, terlepas dari profil gym user.
          new Set<string>(["barbell", "dumbbell", "machine", "bodyweight", "cardio"])
        : allowedEquipment(fitness?.equipment ?? "rumah_tanpa_alat");
  const userLevel = LEVEL_ORDER[fitness?.experience_level ?? "pemula"];

  const safe = (e: Exercise): boolean =>
    allowed.has(e.equipment) &&
    !e.injury_cautions.some((c) => injuries.includes(c)) &&
    !(lowImpact && isHighImpact(e)) &&
    !(isFertility && isPregnancyUnsafe(e)) &&
    LEVEL_ORDER[e.level] - userLevel < 2;

  // ── Susun slot (kardio finisher dilewati — tetap sesuai program) ──────
  type DayRow = {
    id: string;
    label: string;
    day_index: number;
    exercises: {
      id: string;
      order_index: number;
      baseline_exercise_id: string | null;
      exercise: Exercise;
    }[];
  };
  // Hanya hari program milik sesi ini yang diganti — hari lain tidak disentuh.
  const days = ((program.days ?? []) as unknown as DayRow[])
    .filter((d) => d.id === input.programDayId)
    .sort((a, b) => a.day_index - b.day_index);
  if (days.length === 0) {
    return { error: "Hari program tidak ditemukan di program aktif." };
  }

  const slots: Slot[] = [];
  for (const day of days) {
    const rows = (day.exercises ?? []).sort((a, b) => a.order_index - b.order_index);
    for (const pe of rows) {
      const cur = pe.exercise;
      if (!cur || cur.movement_pattern === "cardio") continue;
      const candidates = pool
        .filter((e) => e.movement_pattern === cur.movement_pattern && safe(e))
        .sort(
          (a, b) =>
            Math.abs(LEVEL_ORDER[a.level] - userLevel) -
              Math.abs(LEVEL_ORDER[b.level] - userLevel) ||
            (usage.get(a.slug)?.sets ?? 0) - (usage.get(b.slug)?.sets ?? 0),
        )
        .slice(0, 8);
      if (candidates.length === 0) continue;
      slots.push({
        id: pe.id,
        day_label: day.label,
        order_index: pe.order_index,
        current: cur,
        baseline_exercise_id: pe.baseline_exercise_id ?? null,
        candidates,
      });
    }
  }
  if (slots.length === 0) return { error: "Tidak ada slot latihan yang bisa diganti." };

  // ── Prompt AI ─────────────────────────────────────────────────────────
  const sessionLines = (sessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => {
      const label =
        (s.program_day as unknown as { label?: string } | null)?.label ?? "Sesi";
      return `- ${format(new Date(s.completed_at as string), "yyyy-MM-dd")}: ${label}, volume ${Math.round(Number(s.total_volume ?? 0))} kg`;
    })
    .join("\n");

  const slotLines = slots
    .map((s) => {
      const cands = s.candidates
        .map((c) => `    · ${c.slug} (${c.name}, ${c.equipment}, ${c.level}; ${usageLabel(c.slug)})`)
        .join("\n");
      return `- slot_id: ${s.id} | hari: ${s.day_label} | kategori: ${s.current.movement_pattern}
  saat ini: ${s.current.slug} (${s.current.name}; ${usageLabel(s.current.slug)})
  kandidat:
${cands}`;
    })
    .join("\n");

  const prompt = `Kamu personal trainer bersertifikat (NSCA-CPT) di aplikasi fitness Indonesia.
Susun ulang latihan pada SATU hari program user di bawah (hari lain tidak diubah). Pelajari dulu track record-nya, lalu untuk TIAP slot pilih satu gerakan dari daftar kandidat slot itu (boleh mempertahankan gerakan saat ini bila memang paling tepat).

Profil user:
- Tujuan: ${program.goal ? (GOAL_LABEL[program.goal] ?? program.goal) : "kebugaran umum"}
- Level: ${fitness?.experience_level ? (LEVEL_LABEL[fitness.experience_level] ?? fitness.experience_level) : "pemula"}
- Cedera/keluhan: ${injuries.join(", ") || "tidak ada"}
- Mode alat: ${input.equipmentMode === "bodyweight" ? "TANPA ALAT semua (bodyweight)" : "campur alat/mesin sesuai profil"}

Track record sesi selesai terakhir:
${sessionLines || "- belum ada sesi selesai"}

Slot program (kandidat per slot sudah difilter aman untuk alat, cedera, level & tujuan user):
${slotLines}

Aturan WAJIB:
- slug hanya dari daftar kandidat slot tersebut (atau slug gerakan saat ini).
- TIDAK BOLEH ada gerakan sama dua kali dalam satu hari; hindari juga mengulang gerakan yang sama di banyak hari bila ada alternatif setara.
- Prioritaskan variasi untuk gerakan yang stagnan/terlalu sering; gerakan yang progresnya bagus boleh dipertahankan; gerakan yang belum pernah dicoba dan levelnya cocok bernilai plus.
- reason singkat & spesifik ke data user, Bahasa Indonesia.`;

  const ai = createAI();
  const preferred = input.model ?? DEFAULT_COACH_MODEL;
  const models = [preferred, ...COACH_MODELS.filter((m) => m !== preferred)];
  let parsed: { summary: string; picks: { slot_id: string; slug: string; reason: string }[] } | null =
    null;
  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      parsed = JSON.parse(response.text ?? "");
      if (!parsed || !Array.isArray(parsed.picks)) throw new Error("Format AI tidak valid.");
      break;
    } catch (error) {
      lastError = error;
      parsed = null;
      continue;
    }
  }
  if (!parsed) {
    if (isQuotaError(lastError)) return { error: ALL_QUOTA_EXHAUSTED_MESSAGE };
    return { error: "Gagal menyusun latihan otomatis. Coba lagi ya." };
  }

  // ── Validasi & anti-tabrakan (dedup per hari) di server ───────────────
  const pickBySlot = new Map(parsed.picks.map((p) => [p.slot_id, p]));
  const chosen = new Map<string, { exercise: Exercise; reason: string }>();
  const usedPerDay = new Map<string, Set<string>>();

  for (const slot of slots) {
    const used = usedPerDay.get(slot.day_label) ?? new Set<string>();
    usedPerDay.set(slot.day_label, used);

    const pick = pickBySlot.get(slot.id);
    const bySlug = new Map(slot.candidates.map((c) => [c.slug, c]));
    let exercise =
      pick && pick.slug === slot.current.slug
        ? slot.current
        : (pick && bySlug.get(pick.slug)) || null;
    // Slug tidak valid / sudah dipakai hari itu → fallback deterministik:
    // gerakan saat ini, lalu kandidat pertama yang belum dipakai.
    if (!exercise || used.has(exercise.slug)) {
      exercise = !used.has(slot.current.slug) ? slot.current : null;
      if (!exercise) {
        exercise = slot.candidates.find((c) => !used.has(c.slug)) ?? slot.current;
      }
    }
    used.add(exercise.slug);
    chosen.set(slot.id, {
      exercise,
      reason: pick?.reason ?? "Disusun ulang oleh AI berdasarkan track record.",
    });
  }

  const changes: AutoGenerateChange[] = [];

  for (const slot of slots) {
    const c = chosen.get(slot.id)!;
    if (c.exercise.id === slot.current.id) continue;

    if (input.apply === "permanent") {
      const { error } = await supabase
        .from("program_exercises")
        .update({
          exercise_id: c.exercise.id,
          // Simpan gerakan asli SEKALI (saat pertama diubah permanen) agar bisa
          // dikembalikan ke latihan awal kapan pun.
          baseline_exercise_id: slot.baseline_exercise_id ?? slot.current.id,
        })
        .eq("id", slot.id)
        .eq("user_id", user.id);
      if (error) return { error: friendlyMigrationError(error.message) };
      // Override tanggal ini untuk slot ini jadi tidak relevan — bersihkan
      // agar tidak menutupi perubahan permanen.
      await supabase
        .from("exercise_overrides")
        .delete()
        .eq("user_id", user.id)
        .eq("program_exercise_id", slot.id)
        .eq("override_date", input.date);
    } else {
      const { error } = await supabase.from("exercise_overrides").upsert(
        {
          user_id: user.id,
          program_exercise_id: slot.id,
          replacement_exercise_id: c.exercise.id,
          override_date: input.date,
          source: "ai",
          reason: c.reason,
        },
        { onConflict: "program_exercise_id,override_date" },
      );
      if (error) return { error: error.message };
    }

    changes.push({
      day_label: slot.day_label,
      from: slot.current.name,
      to: c.exercise.name,
      reason: c.reason,
    });
  }

  revalidatePath("/", "layout");
  return { summary: String(parsed.summary ?? ""), changes };
}

/**
 * Kembalikan SEMUA latihan satu hari program ke kondisi awal:
 * (1) hapus penggantian sementara (override) pada tanggal itu, dan
 * (2) pulihkan slot yang pernah diubah PERMANEN dari baseline (gerakan asli).
 * Aman dipanggil walau tidak ada yang berubah.
 */
export async function restoreDayToOriginal(input: {
  programDayId: string;
  date: string;
}): Promise<{ error?: string; restored: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "Tanggal tidak valid.", restored: 0 };
  }
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi.", restored: 0 };

  // Slot milik hari program ini (verifikasi kepemilikan lewat user_id).
  const { data: pes, error: peError } = await supabase
    .from("program_exercises")
    .select("id, baseline_exercise_id")
    .eq("program_day_id", input.programDayId)
    .eq("user_id", user.id);
  if (peError) return { error: friendlyMigrationError(peError.message), restored: 0 };
  const rows = (pes ?? []) as { id: string; baseline_exercise_id: string | null }[];
  if (rows.length === 0) return { error: "Hari program tidak ditemukan.", restored: 0 };

  const peIds = rows.map((r) => r.id);
  let restored = 0;

  // (1) Hapus override tanggal ini untuk seluruh slot hari ini.
  const { data: removed } = await supabase
    .from("exercise_overrides")
    .delete()
    .eq("user_id", user.id)
    .eq("override_date", input.date)
    .in("program_exercise_id", peIds)
    .select("id");
  restored += (removed ?? []).length;

  // (2) Pulihkan slot yang pernah diubah permanen → gerakan asli.
  for (const r of rows) {
    if (!r.baseline_exercise_id) continue;
    const { error } = await supabase
      .from("program_exercises")
      .update({ exercise_id: r.baseline_exercise_id, baseline_exercise_id: null })
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) return { error: error.message, restored };
    restored += 1;
  }

  revalidatePath("/", "layout");
  return { restored };
}
