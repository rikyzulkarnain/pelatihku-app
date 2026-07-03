"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getActiveProgram } from "@/features/program/action";
import { getFitnessProfile, getProfile } from "@/features/profile/action";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";

export type HomeData = {
  name: string;
  streak: number;
  weekDone: number;
  weekGoal: number;
  weekDots: { day: string; done: boolean; today: boolean }[];
  totalVolume: number;
  sessionsTotal: number;
  proteinNow: number;
  proteinTarget: number;
  caloriesNow: number;
  calorieTarget: number;
  /** Otot yang dilatih < 48 jam terakhir (masih masa pemulihan). */
  recovery: { muscle: string; hoursAgo: number }[];
  today: {
    programId: string;
    dayId: string;
    label: string;
    focus: string;
    exerciseCount: number;
    estMinutes: number;
  } | null;
};

const DAY_INITIALS = ["S", "S", "R", "K", "J", "S", "M"]; // Mon..Sun (Senin..Minggu)

export async function getHomeData(): Promise<HomeData> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [profile, fitness, program] = await Promise.all([
    getProfile(),
    getFitnessProfile(),
    getActiveProgram(),
  ]);

  const empty: HomeData = {
    name: profile?.name ?? "Atlet",
    streak: 0,
    weekDone: 0,
    weekGoal: program?.frequency_per_week ?? 3,
    weekDots: [],
    totalVolume: 0,
    sessionsTotal: 0,
    proteinNow: 0,
    proteinTarget: fitness?.daily_protein_target_g ?? 0,
    caloriesNow: 0,
    calorieTarget: fitness?.daily_calorie_target ?? 0,
    recovery: [],
    today: null,
  };

  if (!user) return empty;

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("completed_at, total_volume")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(120);

  const completed = sessions ?? [];
  const completedCount = completed.length;
  const totalVolume = completed.reduce(
    (acc, s) => acc + Number(s.total_volume ?? 0),
    0,
  );

  const completedDates = completed
    .filter((s) => s.completed_at)
    .map((s) => new Date(s.completed_at as string));

  // Streak (allow today missing).
  const dateSet = new Set(completedDates.map((d) => d.toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!dateSet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Weekly dots (Mon..Sun).
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekDots = weekDays.map((d, i) => ({
    day: DAY_INITIALS[i],
    done: completedDates.some((cd) => isSameDay(cd, d)),
    today: isSameDay(d, new Date()),
  }));
  const weekDone = weekDots.filter((d) => d.done).length;

  // Asupan hari ini + status pemulihan otot 48 jam terakhir (paralel).
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const [{ data: foods }, { data: recentSets }] = await Promise.all([
    supabase
      .from("nutrition_logs")
      .select("protein_g, calories")
      .eq("user_id", user.id)
      .eq("log_date", format(new Date(), "yyyy-MM-dd")),
    supabase
      .from("set_logs")
      .select("created_at, exercise:exercises!inner(muscle_group, category)")
      .eq("user_id", user.id)
      .gte("created_at", cutoff48h)
      .order("created_at", { ascending: false })
      .limit(300)
      .returns<
        { created_at: string; exercise: { muscle_group: string; category: string } }[]
      >(),
  ]);
  const proteinNow = Math.round(
    (foods ?? []).reduce((acc, f) => acc + Number(f.protein_g ?? 0), 0),
  );
  const caloriesNow = Math.round(
    (foods ?? []).reduce((acc, f) => acc + Number(f.calories ?? 0), 0),
  );

  // Otot per grup: kapan terakhir dilatih (kardio tidak dihitung melatih otot).
  const recoveryMap = new Map<string, number>();
  for (const r of recentSets ?? []) {
    if (r.exercise?.category === "cardio") continue;
    const muscle = r.exercise?.muscle_group;
    if (!muscle || recoveryMap.has(muscle)) continue;
    recoveryMap.set(
      muscle,
      Math.round((Date.now() - new Date(r.created_at).getTime()) / 3_600_000),
    );
  }
  const recovery = Array.from(recoveryMap.entries())
    .map(([muscle, hoursAgo]) => ({ muscle, hoursAgo }))
    .sort((a, b) => a.hoursAgo - b.hoursAgo);

  // Today's workout = next day in rotation.
  let today: HomeData["today"] = null;
  if (program && program.days.length > 0) {
    const idx = completedCount % program.days.length;
    const day = program.days[idx];
    const count = day.exercises.length;
    today = {
      programId: program.id,
      dayId: day.id,
      label: day.label,
      focus: day.focus ?? program.split_type,
      exerciseCount: count,
      estMinutes: Math.max(25, count * 9),
    };
  }

  return {
    name: profile?.name ?? "Atlet",
    streak,
    weekDone,
    weekGoal: program?.frequency_per_week ?? 3,
    weekDots,
    totalVolume: Math.round(totalVolume),
    sessionsTotal: completedCount,
    proteinNow,
    proteinTarget: fitness?.daily_protein_target_g ?? 0,
    caloriesNow,
    calorieTarget: fitness?.daily_calorie_target ?? 0,
    recovery,
    today,
  };
}
