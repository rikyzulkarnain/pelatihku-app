"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Exercise } from "@/types/program";
import { OverloadSuggestion, SetLog } from "@/types/workout";
import { revalidatePath } from "next/cache";
import { suggestNextSet } from "./overload";

export async function startOrResumeSession(
  programId: string,
  programDayId: string,
): Promise<{ sessionId?: string; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_day_id", programDayId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { sessionId: existing.id };

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      program_id: programId,
      program_day_id: programDayId,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Gagal memulai sesi." };
  return { sessionId: data.id };
}

export type SessionExercise = {
  program_exercise_id: string;
  exercise: Exercise;
  target_sets: number;
  target_rep_low: number;
  target_rep_high: number;
  notes: string | null;
  suggestion: OverloadSuggestion;
  last_label: string;
  logged: { set_index: number; weight_kg: number; reps: number }[];
};

export type SessionData = {
  session_id: string;
  day_label: string;
  exercises: SessionExercise[];
};

export async function getSessionData(
  sessionId: string,
): Promise<SessionData | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, program_day_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session?.program_day_id) return null;

  // Ambil detail hari + set yang sudah tercatat di sesi ini secara paralel.
  const [{ data: day }, { data: currentSets }] = await Promise.all([
    supabase
      .from("program_days")
      .select(
        "label, exercises:program_exercises(id, order_index, target_sets, target_rep_low, target_rep_high, notes, exercise:exercises(*))",
      )
      .eq("id", session.program_day_id)
      .single(),
    supabase
      .from("set_logs")
      .select("exercise_id, set_index, weight_kg, reps")
      .eq("session_id", sessionId)
      .order("set_index", { ascending: true }),
  ]);

  if (!day) return null;

  const programExercises = (day.exercises ?? []).sort(
    (a: { order_index: number }, b: { order_index: number }) =>
      a.order_index - b.order_index,
  );

  // Riwayat set dari sesi-sesi sebelumnya untuk SEMUA gerakan di hari ini —
  // satu query saja (bukan per-gerakan) supaya tidak ada N+1 round-trip.
  const exerciseIds = programExercises
    .map((pe) => (pe.exercise as unknown as Exercise)?.id)
    .filter(Boolean) as string[];

  const priorByExercise = new Map<string, SetLog[]>();
  if (exerciseIds.length > 0) {
    const { data: allPrior } = await supabase
      .from("set_logs")
      .select("*")
      .eq("user_id", user.id)
      .in("exercise_id", exerciseIds)
      .neq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(Math.max(60, exerciseIds.length * 12))
      .returns<SetLog[]>();

    // Sudah terurut created_at desc → entri pertama tiap gerakan = paling baru.
    for (const s of allPrior ?? []) {
      const arr = priorByExercise.get(s.exercise_id);
      if (arr) arr.push(s);
      else priorByExercise.set(s.exercise_id, [s]);
    }
  }

  const exercises: SessionExercise[] = [];

  for (const pe of programExercises) {
    const exercise = pe.exercise as unknown as Exercise;

    // Set dari sesi terakhir untuk gerakan ini (untuk saran overload).
    const priorSets = priorByExercise.get(exercise.id) ?? [];
    let lastSession: SetLog[] = [];
    let lastLabel = "belum ada data";
    if (priorSets.length > 0) {
      const lastSessionId = priorSets[0].session_id;
      lastSession = priorSets.filter((s) => s.session_id === lastSessionId);
      const top = Math.max(...lastSession.map((s) => s.weight_kg));
      lastLabel = top > 0 ? `${top} kg` : "bodyweight";
    }

    const suggestion = suggestNextSet(
      lastSession,
      { rep_low: pe.target_rep_low, rep_high: pe.target_rep_high },
      exercise.equipment,
    );

    exercises.push({
      program_exercise_id: pe.id,
      exercise,
      target_sets: pe.target_sets,
      target_rep_low: pe.target_rep_low,
      target_rep_high: pe.target_rep_high,
      notes: pe.notes,
      suggestion,
      last_label: lastLabel,
      logged: (currentSets ?? [])
        .filter((s) => s.exercise_id === exercise.id)
        .map((s) => ({
          set_index: s.set_index,
          weight_kg: Number(s.weight_kg),
          reps: s.reps,
        })),
    });
  }

  return {
    session_id: sessionId,
    day_label: day.label,
    exercises,
  };
}

export async function logSet(input: {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir." };

  // Replace any existing log for this set slot (idempotent toggle-on).
  await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", input.sessionId)
    .eq("exercise_id", input.exerciseId)
    .eq("set_index", input.setIndex);

  const { error } = await supabase.from("set_logs").insert({
    session_id: input.sessionId,
    exercise_id: input.exerciseId,
    user_id: user.id,
    set_index: input.setIndex,
    weight_kg: input.weightKg,
    reps: input.reps,
  });

  if (error) return { error: error.message };
  return {};
}

export async function removeSet(input: {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
}): Promise<void> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;
  await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", input.sessionId)
    .eq("exercise_id", input.exerciseId)
    .eq("set_index", input.setIndex)
    .eq("user_id", user.id);
}

export async function completeSession(
  sessionId: string,
): Promise<{ volume: number; streak: number; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { volume: 0, streak: 0, error: "Sesi berakhir." };

  const { data: sets } = await supabase
    .from("set_logs")
    .select("weight_kg, reps, is_warmup")
    .eq("session_id", sessionId);

  const volume = (sets ?? [])
    .filter((s) => !s.is_warmup)
    .reduce((acc, s) => acc + Number(s.weight_kg) * s.reps, 0);

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_volume: volume,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { volume: 0, streak: 0, error: error.message };

  const streak = await computeStreak(user.id);
  revalidatePath("/", "layout");
  return { volume: Math.round(volume), streak };
}

async function computeStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(60);

  if (!data || data.length === 0) return 0;

  const days = new Set(
    data
      .filter((s) => s.completed_at)
      .map((s) => new Date(s.completed_at as string).toDateString()),
  );

  let streak = 0;
  const cursor = new Date();
  // Allow today to be missing (streak counts up to yesterday too).
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
