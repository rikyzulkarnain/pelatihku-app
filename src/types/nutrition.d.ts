import { Goal } from "./profile";

export type NutritionTarget = {
  user_id: string;
  effective_date: string;
  calorie_target: number;
  protein_target_g: number;
  tdee: number;
  goal: Goal;
};

export type NutritionLog = {
  id: string;
  user_id: string;
  log_date: string;
  food_name: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  calories: number;
  created_at: string;
};

export type BodyweightLog = {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number;
  created_at: string;
};

export type FoodExample = {
  name: string;
  protein_g: number;
  calories: number;
  portion: string;
};
