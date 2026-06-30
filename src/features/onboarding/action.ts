"use server";

import { createClient } from "@/lib/supabase/server";
import { computeNutrition } from "@/features/nutrition/calc";
import { OnboardingAnswers } from "@/types/profile";
import { addMonths, format } from "date-fns";
import { revalidatePath } from "next/cache";

function resolveDeadline(value: string | null): string | null {
  const today = new Date();
  switch (value) {
    case "1m":
      return format(addMonths(today, 1), "yyyy-MM-dd");
    case "3m":
      return format(addMonths(today, 3), "yyyy-MM-dd");
    case "6m":
      return format(addMonths(today, 6), "yyyy-MM-dd");
    default:
      return null;
  }
}

export async function completeOnboarding(
  answers: OnboardingAnswers,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const nutrition = computeNutrition({
    gender: answers.gender,
    age: answers.age,
    weight_kg: answers.weight_kg,
    height_cm: answers.height_cm,
    training_frequency: answers.training_frequency,
    goal: answers.goal,
  });

  const { error: fpError } = await supabase
    .from("fitness_profiles")
    .update({
      gender: answers.gender,
      age: answers.age,
      weight_kg: answers.weight_kg,
      height_cm: answers.height_cm,
      goal: answers.goal,
      experience_level: answers.experience_level,
      training_frequency: answers.training_frequency,
      equipment: answers.equipment,
      injuries: answers.injuries,
      target_deadline: resolveDeadline(answers.target_deadline),
      tdee: nutrition.tdee,
      daily_calorie_target: nutrition.daily_calorie_target,
      daily_protein_target_g: nutrition.daily_protein_target_g,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (fpError) return { error: fpError.message };

  const { error: ntError } = await supabase.from("nutrition_targets").upsert(
    {
      user_id: user.id,
      effective_date: format(new Date(), "yyyy-MM-dd"),
      calorie_target: nutrition.daily_calorie_target,
      protein_target_g: nutrition.daily_protein_target_g,
      tdee: nutrition.tdee,
      goal: answers.goal,
    },
    { onConflict: "user_id,effective_date" },
  );

  if (ntError) return { error: ntError.message };

  // Seed today's bodyweight from onboarding for the progress chart.
  await supabase.from("bodyweight_logs").upsert(
    {
      user_id: user.id,
      log_date: format(new Date(), "yyyy-MM-dd"),
      weight_kg: answers.weight_kg,
    },
    { onConflict: "user_id,log_date" },
  );

  revalidatePath("/", "layout");
  return {};
}
