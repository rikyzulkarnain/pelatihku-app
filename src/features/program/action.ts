"use server";

import { createClient } from "@/lib/supabase/server";
import { Exercise, Program, ProgramDay } from "@/types/program";
import { FitnessProfile } from "@/types/profile";
import { revalidatePath } from "next/cache";
import { generateProgram } from "./generator";

export async function generateAndCreateProgram(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      experience_level: fitness.experience_level ?? "pemula",
      training_frequency: fitness.training_frequency,
      equipment: fitness.equipment,
      injuries: fitness.injuries ?? [],
    },
    exercises,
  );

  // Deactivate previous programs.
  await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

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
      is_active: true,
      generated_meta: plan.generated_meta,
    })
    .select("id")
    .single();

  if (programError || !program) {
    return { error: programError?.message ?? "Gagal membuat program." };
  }

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

    if (dayError || !dayRow) {
      return { error: dayError?.message ?? "Gagal menyimpan hari latihan." };
    }

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
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
        })),
      );
      if (exError) return { error: exError.message };
    }
  }

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
      rest_seconds: number;
      notes: string | null;
      exercise: Exercise;
    }[];
  })[];
};

export async function getActiveProgram(): Promise<ProgramWithDays | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      "*, exercises:program_exercises(id, order_index, target_sets, target_rep_low, target_rep_high, rest_seconds, notes, exercise:exercises(*))",
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
