"use server";

import { createClient } from "@/lib/supabase/server";
import { BodyweightLog } from "@/types/nutrition";
import {
  format,
  getISOWeek,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { revalidatePath } from "next/cache";

export type ProgressData = {
  totalSessions: number;
  longestStreak: number;
  latestWeight: number | null;
  weightDelta: number | null;
  weightSeries: { label: string; weight: number }[];
  volumeSeries: { label: string; volume: number }[];
};

function longestStreakFrom(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = Array.from(new Set(dates.map((d) => d.toDateString())))
    .map((s) => new Date(s).getTime())
    .sort((a, b) => a - b);

  let longest = 1;
  let cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i] - days[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      cur += 1;
      longest = Math.max(longest, cur);
    } else if (diff > 1) {
      cur = 1;
    }
  }
  return longest;
}

export async function getProgressData(): Promise<ProgressData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: ProgressData = {
    totalSessions: 0,
    longestStreak: 0,
    latestWeight: null,
    weightDelta: null,
    weightSeries: [],
    volumeSeries: [],
  };
  if (!user) return empty;

  const [{ data: sessions }, { data: weights }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("completed_at, total_volume")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: true }),
    supabase
      .from("bodyweight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: true })
      .limit(20)
      .returns<BodyweightLog[]>(),
  ]);

  const completed = sessions ?? [];
  const completedDates = completed
    .filter((s) => s.completed_at)
    .map((s) => new Date(s.completed_at as string));

  // Weekly volume (last 6 ISO weeks present in data).
  const weekMap = new Map<string, { label: string; volume: number; sort: number }>();
  for (const s of completed) {
    if (!s.completed_at) continue;
    const d = new Date(s.completed_at);
    const wk = startOfISOWeek(d);
    const key = format(wk, "yyyy-ww");
    const existing = weekMap.get(key);
    const vol = Number(s.total_volume ?? 0);
    if (existing) existing.volume += vol;
    else
      weekMap.set(key, {
        label: `Mgg ${getISOWeek(d)}`,
        volume: vol,
        sort: wk.getTime(),
      });
  }
  const volumeSeries = Array.from(weekMap.values())
    .sort((a, b) => a.sort - b.sort)
    .slice(-6)
    .map(({ label, volume }) => ({ label, volume: Math.round(volume) }));

  const weightSeries = (weights ?? []).slice(-8).map((w) => ({
    label: format(parseISO(w.log_date), "d/M"),
    weight: Number(w.weight_kg),
  }));

  const latestWeight = weightSeries.length
    ? weightSeries[weightSeries.length - 1].weight
    : null;
  const weightDelta =
    weightSeries.length >= 2
      ? Math.round((latestWeight! - weightSeries[0].weight) * 10) / 10
      : null;

  return {
    totalSessions: completed.length,
    longestStreak: longestStreakFrom(completedDates),
    latestWeight,
    weightDelta,
    weightSeries,
    volumeSeries,
  };
}

export async function logBodyweight(
  weightKg: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir." };

  const { error } = await supabase.from("bodyweight_logs").upsert(
    {
      user_id: user.id,
      log_date: format(new Date(), "yyyy-MM-dd"),
      weight_kg: weightKg,
    },
    { onConflict: "user_id,log_date" },
  );

  if (error) return { error: error.message };

  // Keep fitness profile weight in sync.
  await supabase
    .from("fitness_profiles")
    .update({ weight_kg: weightKg, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  revalidatePath("/progress");
  revalidatePath("/home");
  return {};
}
