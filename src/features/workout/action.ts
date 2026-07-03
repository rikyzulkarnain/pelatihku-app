"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { MUSCLE_LABEL } from "@/constants/labels";
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
  rest_seconds: number;
  notes: string | null;
  suggestion: OverloadSuggestion;
  last_label: string;
  logged: { set_index: number; weight_kg: number; reps: number }[];
};

export type SessionData = {
  session_id: string;
  day_label: string;
  exercises: SessionExercise[];
  /** Peringatan recovery bila otot hari ini baru dilatih < 48 jam. */
  rest_warning: string | null;
};

export async function getSessionData(
  sessionId: string,
): Promise<SessionData | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  // Satu query untuk sesi + hari + gerakan sekaligus (dulu 2 round-trip berantai).
  const { data: session } = await supabase
    .from("workout_sessions")
    .select(
      "id, program_day_id, day:program_days(label, exercises:program_exercises(id, order_index, target_sets, target_rep_low, target_rep_high, rest_seconds, notes, exercise:exercises(*)))",
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  const day = session?.day as unknown as {
    label: string;
    exercises: {
      id: string;
      order_index: number;
      target_sets: number;
      target_rep_low: number;
      target_rep_high: number;
      rest_seconds: number | null;
      notes: string | null;
      exercise: Exercise;
    }[];
  } | null;

  if (!session?.program_day_id || !day) return null;

  const programExercises = (day.exercises ?? []).sort(
    (a, b) => a.order_index - b.order_index,
  );
  const exerciseIds = programExercises
    .map((pe) => pe.exercise?.id)
    .filter(Boolean) as string[];

  // Sisa data diambil paralel dalam satu gelombang: set sesi ini, riwayat
  // overload semua gerakan (satu query, bukan N+1), dan rambu recovery.
  const [{ data: currentSets }, { data: allPrior }, restWarning] =
    await Promise.all([
      supabase
        .from("set_logs")
        .select("exercise_id, set_index, weight_kg, reps")
        .eq("session_id", sessionId)
        .order("set_index", { ascending: true }),
      exerciseIds.length > 0
        ? supabase
            .from("set_logs")
            .select("*")
            .eq("user_id", user.id)
            .in("exercise_id", exerciseIds)
            .neq("session_id", sessionId)
            .order("created_at", { ascending: false })
            .limit(Math.max(60, exerciseIds.length * 12))
            .returns<SetLog[]>()
        : Promise.resolve({ data: [] as SetLog[] }),
      computeRestWarning(supabase, user.id, sessionId, session.program_day_id, [
        ...new Set(
          programExercises
            // Kardio bukan latihan beban — jangan dianggap "melatih otot"
            // untuk keperluan rambu recovery 48 jam.
            .filter((pe) => pe.exercise?.category !== "cardio")
            .map((pe) => pe.exercise?.muscle_group)
            .filter(Boolean) as string[],
        ),
      ]),
    ]);

  const priorByExercise = new Map<string, SetLog[]>();
  // Sudah terurut created_at desc → entri pertama tiap gerakan = paling baru.
  for (const s of allPrior ?? []) {
    const arr = priorByExercise.get(s.exercise_id);
    if (arr) arr.push(s);
    else priorByExercise.set(s.exercise_id, [s]);
  }

  const exercises: SessionExercise[] = [];

  for (const pe of programExercises) {
    const exercise = pe.exercise;

    // Set dari sesi terakhir untuk gerakan ini (untuk saran overload).
    const priorSets = priorByExercise.get(exercise.id) ?? [];
    let lastSession: SetLog[] = [];
    let lastLabel = "belum ada data";
    if (priorSets.length > 0) {
      const lastSessionId = priorSets[0].session_id;
      lastSession = priorSets.filter((s) => s.session_id === lastSessionId);
      const top = Math.max(...lastSession.map((s) => s.weight_kg));
      const topReps = Math.max(...lastSession.map((s) => s.reps));
      lastLabel =
        exercise.equipment === "cardio"
          ? `${topReps} mnt`
          : top > 0
            ? `${top} kg`
            : `${topReps} reps`;
    }

    const suggestion = suggestNextSet(
      lastSession,
      {
        rep_low: pe.target_rep_low,
        rep_high: pe.target_rep_high,
        sets: pe.target_sets,
      },
      exercise.equipment,
    );

    exercises.push({
      program_exercise_id: pe.id,
      exercise,
      target_sets: pe.target_sets,
      target_rep_low: pe.target_rep_low,
      target_rep_high: pe.target_rep_high,
      rest_seconds: pe.rest_seconds ?? 90,
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
    rest_warning: restWarning,
  };
}

async function computeRestWarning(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
  programDayId: string,
  muscleGroups: string[],
): Promise<string | null> {
  if (muscleGroups.length === 0) return null;

  // Log 48 jam terakhir beserta otot & asal sesinya — satu query (dulu dua).
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("set_logs")
    .select(
      "created_at, exercise:exercises!inner(muscle_group, category), session:workout_sessions!inner(program_day_id)",
    )
    .eq("user_id", userId)
    .neq("session_id", sessionId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<
      {
        created_at: string;
        exercise: { muscle_group: string; category: string };
        session: { program_day_id: string | null };
      }[]
    >();

  // Jam sejak otot terakhir dilatih (ambil yang paling baru per otot).
  const hoursByMuscle = new Map<string, number>();
  for (const r of recent ?? []) {
    // Sesi lain dari HARI PROGRAM yang sama = workout ini juga (mis. sesi
    // yang terputus lalu dimulai ulang) — bukan latihan terpisah.
    if (r.session?.program_day_id === programDayId) continue;
    // Kardio (jump rope, lari, dst.) tidak dihitung melatih otot.
    if (r.exercise?.category === "cardio") continue;
    const muscle = r.exercise?.muscle_group;
    if (!muscle || hoursByMuscle.has(muscle)) continue;
    const hours =
      (Date.now() - new Date(r.created_at).getTime()) / 3_600_000;
    hoursByMuscle.set(muscle, hours);
  }

  const tired = muscleGroups.filter((m) => hoursByMuscle.has(m));
  if (tired.length === 0) return null;

  const labels = tired.map((m) => MUSCLE_LABEL[m] ?? m);
  const minHours = Math.round(Math.min(...tired.map((m) => hoursByMuscle.get(m)!)));
  return `Otot ${labels.join(", ")} baru dilatih ~${minHours} jam lalu. Idealnya beri jeda ~48 jam biar pulih maksimal — boleh lanjut, tapi jangan dipaksakan.`;
}

export type SetPayload = {
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
};

/**
 * Snapshot penuh set sebuah sesi dari state lokal client → server.
 * Idempotent (hapus lalu tulis ulang), jadi aman dipanggil berulang sebagai
 * background sync maupun flush terakhir saat menyelesaikan sesi.
 */
async function replaceSessionSets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
  sets: SetPayload[],
): Promise<string | null> {
  const { error: delError } = await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (delError) return delError.message;

  if (sets.length === 0) return null;

  const { error } = await supabase.from("set_logs").insert(
    sets.map((s) => ({
      session_id: sessionId,
      exercise_id: s.exerciseId,
      user_id: userId,
      set_index: s.setIndex,
      weight_kg: s.weightKg,
      reps: s.reps,
    })),
  );
  return error?.message ?? null;
}

export async function syncSessionSets(input: {
  sessionId: string;
  sets: SetPayload[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir." };

  const error = await replaceSessionSets(
    supabase,
    user.id,
    input.sessionId,
    input.sets,
  );
  return error ? { error } : {};
}

export async function completeSession(
  sessionId: string,
  finalSets?: SetPayload[],
): Promise<{ volume: number; streak: number; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { volume: 0, streak: 0, error: "Sesi berakhir." };

  // Flush state lokal terakhir sebelum sesi ditutup (mode local-first).
  if (finalSets) {
    const syncError = await replaceSessionSets(
      supabase,
      user.id,
      sessionId,
      finalSets,
    );
    if (syncError) return { volume: 0, streak: 0, error: syncError };
  }

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
