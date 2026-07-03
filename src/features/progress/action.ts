"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getFitnessProfile, getProfile } from "@/features/profile/action";
import { computeNutrition } from "@/features/nutrition/calc";
import { BodyweightLog } from "@/types/nutrition";
import {
  format,
  getISOWeek,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { revalidatePath } from "next/cache";

export type ProgressData = {
  name: string;
  goal: string | null;
  experienceLevel: string | null;
  totalSessions: number;
  longestStreak: number;
  currentStreak: number;
  thisWeekSessions: number;
  totalVolume: number;
  avgVolume: number;
  latestWeight: number | null;
  weightDelta: number | null;
  heightCm: number | null;
  age: number | null;
  bmi: number | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  weightSeries: { label: string; weight: number }[];
  volumeSeries: { label: string; volume: number }[];
};

function currentStreakFrom(dates: Date[]): number {
  const dateSet = new Set(dates.map((d) => d.toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!dateSet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

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
  const user = await getCurrentUser();

  const empty: ProgressData = {
    name: "Atlet",
    goal: null,
    experienceLevel: null,
    totalSessions: 0,
    longestStreak: 0,
    currentStreak: 0,
    thisWeekSessions: 0,
    totalVolume: 0,
    avgVolume: 0,
    latestWeight: null,
    weightDelta: null,
    heightCm: null,
    age: null,
    bmi: null,
    calorieTarget: null,
    proteinTarget: null,
    weightSeries: [],
    volumeSeries: [],
  };
  if (!user) return empty;

  const [{ data: sessions }, { data: weights }, profile, fitness] =
    await Promise.all([
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
      getProfile(),
      getFitnessProfile(),
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

  const latestWeight =
    fitness?.weight_kg ??
    (weightSeries.length ? weightSeries[weightSeries.length - 1].weight : null);
  const weightDelta =
    weightSeries.length >= 2
      ? Math.round(
          (weightSeries[weightSeries.length - 1].weight -
            weightSeries[0].weight) *
            10,
        ) / 10
      : null;

  const totalVolume = Math.round(
    completed.reduce((acc, s) => acc + Number(s.total_volume ?? 0), 0),
  );
  const avgVolume = completed.length
    ? Math.round(totalVolume / completed.length)
    : 0;

  // Sessions completed during the current ISO week.
  const thisWeekStart = startOfISOWeek(new Date());
  const thisWeekSessions = completedDates.filter(
    (d) => d >= thisWeekStart,
  ).length;

  const heightCm = fitness?.height_cm ?? null;
  const bmi =
    latestWeight && heightCm
      ? Math.round((latestWeight / (heightCm / 100) ** 2) * 10) / 10
      : null;

  return {
    name: profile?.name ?? "Atlet",
    goal: fitness?.goal ?? null,
    experienceLevel: fitness?.experience_level ?? null,
    totalSessions: completed.length,
    longestStreak: longestStreakFrom(completedDates),
    currentStreak: currentStreakFrom(completedDates),
    thisWeekSessions,
    totalVolume,
    avgVolume,
    latestWeight,
    weightDelta,
    heightCm,
    age: fitness?.age ?? null,
    bmi,
    calorieTarget: fitness?.daily_calorie_target ?? null,
    proteinTarget: fitness?.daily_protein_target_g ?? null,
    weightSeries,
    volumeSeries,
  };
}

/**
 * Reset total: hapus semua progres (sesi latihan, set, catatan gizi, berat) &
 * program, lalu tandai onboarding belum selesai supaya pengguna mengulang dari
 * penentuan tujuan. Profil akun tetap ada.
 */
export async function resetGoalAndProgress(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  // Urut anak → induk agar aman meski tanpa cascade.
  const tables = [
    "set_logs",
    "workout_sessions",
    "nutrition_logs",
    "nutrition_targets",
    "bodyweight_logs",
    "program_exercises",
    "program_days",
    "programs",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) return { error: error.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  revalidatePath("/", "layout");
  return {};
}

/**
 * Perbarui umur & tinggi badan di profil fitness. Target kalori/protein ikut
 * dihitung ulang (Mifflin-St Jeor) bila data profil lain lengkap, supaya
 * halaman Nutrisi tetap akurat setelah perubahan.
 */
export async function updateBodyProfile(input: {
  age: number;
  heightCm: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir." };

  const age = Math.round(input.age);
  const heightCm = Math.round(input.heightCm);
  if (age < 10 || age > 100) return { error: "Umur harus 10–100 tahun." };
  if (heightCm < 100 || heightCm > 250)
    return { error: "Tinggi harus 100–250 cm." };

  const { data: fitness, error: fetchError } = await supabase
    .from("fitness_profiles")
    .select("gender, weight_kg, goal, training_frequency")
    .eq("user_id", user.id)
    .single();
  if (fetchError) return { error: fetchError.message };

  const patch: Record<string, unknown> = {
    age,
    height_cm: heightCm,
    updated_at: new Date().toISOString(),
  };

  if (fitness?.gender && fitness.weight_kg && fitness.goal && fitness.training_frequency) {
    const result = computeNutrition({
      gender: fitness.gender,
      age,
      weight_kg: Number(fitness.weight_kg),
      height_cm: heightCm,
      training_frequency: fitness.training_frequency,
      goal: fitness.goal,
    });
    patch.tdee = result.tdee;
    patch.daily_calorie_target = result.daily_calorie_target;
    patch.daily_protein_target_g = result.daily_protein_target_g;
  }

  const { error } = await supabase
    .from("fitness_profiles")
    .update(patch)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/progress");
  revalidatePath("/nutrition");
  revalidatePath("/home");
  return {};
}

export async function logBodyweight(
  weightKg: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
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
