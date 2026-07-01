import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { FitnessProfile, Profile } from "@/types/profile";
import { format } from "date-fns";

export type CoachContext = {
  profile: Profile | null;
  fitness: FitnessProfile | null;
  programName: string | null;
  splitType: string | null;
  todayLabel: string | null;
  todayExercises: string[];
  recentSessions: { date: string; label: string; volume: number }[];
  streak: number;
  proteinToday: number;
};

export async function getCoachContext(): Promise<CoachContext> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const base: CoachContext = {
    profile: null,
    fitness: null,
    programName: null,
    splitType: null,
    todayLabel: null,
    todayExercises: [],
    recentSessions: [],
    streak: 0,
    proteinToday: 0,
  };
  if (!user) return base;

  const [{ data: profile }, { data: fitness }, { data: program }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
      supabase
        .from("fitness_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single<FitnessProfile>(),
      supabase
        .from("programs")
        .select("id, name, split_type, frequency_per_week")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("completed_at, total_volume, program_day:program_days(label)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  const recentSessions = (sessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => ({
      date: format(new Date(s.completed_at as string), "d MMM"),
      label:
        (s.program_day as unknown as { label?: string } | null)?.label ?? "Sesi",
      volume: Math.round(Number(s.total_volume ?? 0)),
    }));

  // Streak (allow today missing).
  const dateSet = new Set(
    (sessions ?? [])
      .filter((s) => s.completed_at)
      .map((s) => new Date(s.completed_at as string).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  if (!dateSet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Today's planned day + exercises.
  let todayLabel: string | null = null;
  let todayExercises: string[] = [];
  if (program) {
    const { count } = await supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");

    const { data: days } = await supabase
      .from("program_days")
      .select("label, day_index, exercises:program_exercises(exercise:exercises(name))")
      .eq("program_id", program.id)
      .order("day_index", { ascending: true });

    if (days && days.length > 0) {
      const idx = (count ?? 0) % days.length;
      const day = days[idx];
      todayLabel = day.label;
      todayExercises = (day.exercises ?? [])
        .map((pe: unknown) => {
          const ex = (pe as { exercise?: { name?: string } | { name?: string }[] })
            .exercise;
          const single = Array.isArray(ex) ? ex[0] : ex;
          return single?.name ?? "";
        })
        .filter(Boolean);
    }
  }

  const { data: foods } = await supabase
    .from("nutrition_logs")
    .select("protein_g")
    .eq("user_id", user.id)
    .eq("log_date", format(new Date(), "yyyy-MM-dd"));
  const proteinToday = Math.round(
    (foods ?? []).reduce((acc, f) => acc + Number(f.protein_g ?? 0), 0),
  );

  return {
    profile,
    fitness,
    programName: program?.name ?? null,
    splitType: program?.split_type ?? null,
    todayLabel,
    todayExercises,
    recentSessions,
    streak,
    proteinToday,
  };
}
