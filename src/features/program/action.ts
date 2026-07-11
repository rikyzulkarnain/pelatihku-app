"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Exercise, Program, ProgramDay } from "@/types/program";
import { ExperienceLevel, FitnessProfile } from "@/types/profile";
import { revalidatePath } from "next/cache";
import { generateProgram } from "./generator";
import {
  evaluateProgression,
  ProgressionSession,
  ProgressionStatus,
} from "./progression";

// Pesan ramah untuk error skema (kolom/tabel belum ada = migrasi belum jalan).
function friendlyDbError(message?: string | null): string | undefined {
  if (!message) return undefined;
  const m = message.toLowerCase();
  if (m.includes("could not find") || m.includes("does not exist")) {
    return `Database belum sinkron dengan aplikasi (${message}). Jalankan file migrasi terbaru di src/migrations lewat Supabase SQL editor.`;
  }
  return message;
}

export async function generateAndCreateProgram(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const { data: fitness } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<FitnessProfile>();

  if (!fitness?.goal || !fitness.training_frequency || !fitness.equipment) {
    return { error: "Data onboarding belum lengkap." };
  }

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .returns<Exercise[]>();

  if (!exercises || exercises.length === 0) {
    return { error: "Pustaka gerakan kosong. Jalankan seed database dulu." };
  }

  const plan = generateProgram(
    {
      goal: fitness.goal,
      gender: fitness.gender ?? "rahasia",
      age: fitness.age,
      weight_kg: fitness.weight_kg,
      height_cm: fitness.height_cm,
      experience_level: fitness.experience_level ?? "pemula",
      training_frequency: fitness.training_frequency,
      equipment: fitness.equipment,
      injuries: fitness.injuries ?? [],
      target_deadline: fitness.target_deadline,
    },
    exercises,
  );

  // Program dibuat NONAKTIF dulu, baru diaktifkan setelah semua hari + gerakan
  // tersimpan. Kalau ada langkah yang gagal, seluruh program di-rollback
  // (cascade) — mencegah program aktif setengah jadi yang membuat halaman
  // Program tampak kosong.
  const { data: program, error: programError } = await supabase
    .from("programs")
    .insert({
      user_id: user.id,
      name: plan.name,
      split_type: plan.split_type,
      goal: plan.goal,
      frequency_per_week: plan.frequency_per_week,
      rep_low: plan.rep_low,
      rep_high: plan.rep_high,
      set_low: plan.set_low,
      set_high: plan.set_high,
      includes_cardio: plan.includes_cardio,
      is_active: false,
      generated_meta: plan.generated_meta,
    })
    .select("id")
    .single();

  if (programError || !program) {
    return { error: friendlyDbError(programError?.message) ?? "Gagal membuat program." };
  }

  const rollback = async (message?: string): Promise<{ error: string }> => {
    await supabase.from("programs").delete().eq("id", program.id).eq("user_id", user.id);
    return { error: friendlyDbError(message) ?? "Gagal menyimpan program." };
  };

  for (const day of plan.days) {
    const { data: dayRow, error: dayError } = await supabase
      .from("program_days")
      .insert({
        program_id: program.id,
        user_id: user.id,
        day_index: day.day_index,
        label: day.label,
        focus: day.focus,
      })
      .select("id")
      .single();

    if (dayError || !dayRow) return rollback(dayError?.message);

    if (day.exercises.length > 0) {
      const { error: exError } = await supabase.from("program_exercises").insert(
        day.exercises.map((ex) => ({
          program_day_id: dayRow.id,
          exercise_id: ex.exercise_id,
          user_id: user.id,
          order_index: ex.order_index,
          target_sets: ex.target_sets,
          target_rep_low: ex.target_rep_low,
          target_rep_high: ex.target_rep_high,
          target_intensity_low: ex.target_intensity_low,
          target_intensity_high: ex.target_intensity_high,
          target_rir_low: ex.target_rir_low,
          target_rir_high: ex.target_rir_high,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
        })),
      );
      if (exError) return rollback(exError.message);
    }
  }

  // Semua tersimpan — baru matikan program lama & aktifkan yang baru.
  await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);
  const { error: activateError } = await supabase
    .from("programs")
    .update({ is_active: true })
    .eq("id", program.id)
    .eq("user_id", user.id);
  if (activateError) return rollback(activateError.message);

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return {};
}

export type ProgramWithDays = Program & {
  days: (ProgramDay & {
    exercises: {
      id: string;
      order_index: number;
      target_sets: number;
      target_rep_low: number;
      target_rep_high: number;
      target_intensity_low: number | null;
      target_intensity_high: number | null;
      target_rir_low: number | null;
      target_rir_high: number | null;
      rest_seconds: number;
      notes: string | null;
      exercise: Exercise;
    }[];
  })[];
};

export async function getActiveProgram(): Promise<ProgramWithDays | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Program>();

  if (!program) return null;

  const { data: days } = await supabase
    .from("program_days")
    .select(
      "*, exercises:program_exercises(id, order_index, target_sets, target_rep_low, target_rep_high, target_intensity_low, target_intensity_high, target_rir_low, target_rir_high, rest_seconds, notes, exercise:exercises!program_exercises_exercise_id_fkey(*))",
    )
    .eq("program_id", program.id)
    .order("day_index", { ascending: true });

  const normalizedDays = (days ?? []).map((d) => ({
    ...d,
    exercises: (d.exercises ?? []).sort(
      (a: { order_index: number }, b: { order_index: number }) =>
        a.order_index - b.order_index,
    ),
  })) as ProgramWithDays["days"];

  return { ...program, days: normalizedDays };
}

// ── Auto-adjust 4–6 minggu ──────────────────────────────────────
// Mekanisme "program menyesuaikan otomatis": dievaluasi tiap kali halaman
// Program dibuka (read-only), lalu diterapkan lewat applyProgression().

async function loadProgressionContext(): Promise<{
  status: ProgressionStatus;
  fitness: FitnessProfile;
} | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: program } = await supabase
    .from("programs")
    .select("id, created_at, frequency_per_week")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Program, "id" | "created_at" | "frequency_per_week">>();

  if (!program) return null;

  const { data: fitness } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<FitnessProfile>();

  if (!fitness?.experience_level) return null;

  // Hanya sesi selesai milik program aktif ini (program lama tidak dihitung).
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("completed_at, total_volume")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: true })
    .returns<ProgressionSession[]>();

  const status = evaluateProgression({
    level: fitness.experience_level,
    program_created_at: program.created_at,
    frequency_per_week: program.frequency_per_week,
    sessions: sessions ?? [],
  });

  return { status, fitness };
}

export async function getProgressionStatus(): Promise<ProgressionStatus | null> {
  const ctx = await loadProgressionContext();
  return ctx?.status ?? null;
}

export async function applyProgression(): Promise<{
  error?: string;
  new_level?: ExperienceLevel;
}> {
  // Evaluasi ulang di server (jangan percaya klaim klien).
  const ctx = await loadProgressionContext();
  if (!ctx || ctx.status.decision.action !== "promote") {
    return { error: "Program belum memenuhi syarat penyesuaian." };
  }
  const nextLevel = ctx.status.decision.next_level;

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const { error } = await supabase
    .from("fitness_profiles")
    .update({ experience_level: nextLevel })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  // Regenerasi program dengan level baru (generator membaca ulang profil).
  const res = await generateAndCreateProgram();
  if (res.error) return { error: res.error };

  return { new_level: nextLevel };
}
