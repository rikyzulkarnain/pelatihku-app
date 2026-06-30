import { Gender, Goal } from "@/types/profile";

type CalcInput = {
  gender: Gender;
  age: number;
  weight_kg: number;
  height_cm: number;
  training_frequency: number;
  goal: Goal;
};

// Mifflin-St Jeor BMR.
function bmr({ gender, weight_kg, height_cm, age }: CalcInput): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === "cowok") return base + 5;
  if (gender === "cewek") return base - 161;
  return base - 78; // 'rahasia' = average of +5 / -161
}

function activityFactor(freq: number): number {
  if (freq <= 2) return 1.375;
  if (freq <= 4) return 1.55;
  return 1.725;
}

const GOAL_CALORIE_MULTIPLIER: Record<Goal, number> = {
  turun_lemak: 0.8,
  naik_massa: 1.1,
  toning: 0.9,
  strength: 1.05,
  kebugaran_umum: 1,
  kesuburan: 1, // maintenance — defisit agresif mengganggu hormon/kesuburan
};

const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  turun_lemak: 2.2,
  naik_massa: 2.0,
  toning: 1.8,
  strength: 2.0,
  kebugaran_umum: 1.6,
  kesuburan: 1.8,
};

export type NutritionResult = {
  tdee: number;
  daily_calorie_target: number;
  daily_protein_target_g: number;
};

export function computeNutrition(input: CalcInput): NutritionResult {
  const tdee = Math.round(bmr(input) * activityFactor(input.training_frequency));
  const daily_calorie_target = Math.round(
    tdee * GOAL_CALORIE_MULTIPLIER[input.goal],
  );
  const daily_protein_target_g = Math.round(
    input.weight_kg * GOAL_PROTEIN_PER_KG[input.goal],
  );
  return { tdee, daily_calorie_target, daily_protein_target_g };
}
