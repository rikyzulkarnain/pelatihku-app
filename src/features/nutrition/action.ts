"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { FitnessProfile } from "@/types/profile";
import { NutritionLog, NutritionTarget } from "@/types/nutrition";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export type NutritionData = {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  tdee: number;
  goal: string;
  bmi: number | null;
  bmiCategory: string;
  proteinNow: number;
  carbNow: number;
  fatNow: number;
  calorieNow: number;
  logs: NutritionLog[];
  /** Sesi latihan terakhir yang selesai — untuk evaluasi asupan yang tegas. */
  lastSession: { label: string; volume: number } | null;
};

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "kurus";
  if (bmi < 25) return "ideal";
  if (bmi < 30) return "berlebih";
  return "obesitas";
}

export async function getNutritionData(
  logDate?: string,
): Promise<NutritionData> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const date = logDate ?? format(new Date(), "yyyy-MM-dd");

  const empty: NutritionData = {
    calorieTarget: 0,
    proteinTarget: 0,
    carbTarget: 0,
    fatTarget: 0,
    tdee: 0,
    goal: "kebugaran_umum",
    bmi: null,
    bmiCategory: "-",
    proteinNow: 0,
    carbNow: 0,
    fatNow: 0,
    calorieNow: 0,
    logs: [],
    lastSession: null,
  };
  if (!user) return empty;

  const [{ data: fitness }, { data: target }, { data: logs }, { data: lastSess }] = await Promise.all([
    supabase.from("fitness_profiles").select("*").eq("user_id", user.id).single<FitnessProfile>(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle<NutritionTarget>(),
    supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .order("created_at", { ascending: false })
      .returns<NutritionLog[]>(),
    supabase
      .from("workout_sessions")
      .select("total_volume, program_day:program_days(label)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const calorieTarget = target?.calorie_target ?? fitness?.daily_calorie_target ?? 0;
  const proteinTarget = target?.protein_target_g ?? fitness?.daily_protein_target_g ?? 0;

  // Derive carbs/fat from remaining calories (after protein), ~50/50 split.
  const proteinCal = proteinTarget * 4;
  const remaining = Math.max(0, calorieTarget - proteinCal);
  const carbTarget = Math.round((remaining * 0.5) / 4);
  const fatTarget = Math.round((remaining * 0.5) / 9);

  let bmi: number | null = null;
  let category = "-";
  if (fitness?.weight_kg && fitness?.height_cm) {
    const m = Number(fitness.height_cm) / 100;
    bmi = Math.round((Number(fitness.weight_kg) / (m * m)) * 10) / 10;
    category = bmiCategory(bmi);
  }

  const sumLog = (key: "protein_g" | "carb_g" | "fat_g" | "calories") =>
    Math.round((logs ?? []).reduce((acc, l) => acc + Number(l[key] ?? 0), 0));

  return {
    calorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    tdee: target?.tdee ?? fitness?.tdee ?? 0,
    goal: target?.goal ?? fitness?.goal ?? "kebugaran_umum",
    bmi,
    bmiCategory: category,
    proteinNow: sumLog("protein_g"),
    carbNow: sumLog("carb_g"),
    fatNow: sumLog("fat_g"),
    calorieNow: sumLog("calories"),
    logs: logs ?? [],
    lastSession: lastSess
      ? {
          label:
            (lastSess.program_day as unknown as { label?: string } | null)
              ?.label ?? "latihan",
          volume: Math.round(Number(lastSess.total_volume ?? 0)),
        }
      : null,
  };
}

/** Catatan makan untuk satu tanggal (dipakai saat berpindah tanggal di UI). */
export async function getNutritionLogsForDate(
  date: string,
): Promise<NutritionLog[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", date)
    .order("created_at", { ascending: false })
    .returns<NutritionLog[]>();

  return data ?? [];
}

export async function logFood(input: {
  food_name: string;
  protein_g: number;
  carb_g?: number;
  fat_g?: number;
  calories: number;
  /** yyyy-MM-dd — bila diisi tanggal lampau, dicatat mundur ke tanggal itu. */
  log_date?: string;
}): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir." };

  const { data, error } = await supabase
    .from("nutrition_logs")
    .insert({
      user_id: user.id,
      log_date: input.log_date ?? format(new Date(), "yyyy-MM-dd"),
      food_name: input.food_name,
      protein_g: input.protein_g,
      carb_g: input.carb_g ?? 0,
      fat_g: input.fat_g ?? 0,
      calories: input.calories,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  revalidatePath("/home");
  return { id: data.id as string };
}

export async function deleteFood(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir." };

  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  revalidatePath("/home");
  return {};
}
