import { Equipment, ExperienceLevel, Gender, Goal } from "./profile";

export type MuscleGroup =
  | "legs"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "push_horizontal"
  | "push_vertical"
  | "pull_horizontal"
  | "pull_vertical"
  | "isolation_chest"
  | "isolation_back"
  | "isolation_biceps"
  | "isolation_triceps"
  | "isolation_legs"
  | "calf"
  | "core"
  | "cardio";

export type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "bodyweight"
  | "cardio";

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  name_id: string | null;
  muscle_group: MuscleGroup;
  secondary_muscles: string[];
  movement_pattern: MovementPattern;
  category: "compound" | "isolation" | "cardio";
  equipment: EquipmentType;
  level: ExperienceLevel;
  is_compound: boolean;
  technique_steps: string[];
  injury_cautions: string[];
  variation_group: string | null;
  default_unilateral: boolean;
  video_url: string | null;
  image_url: string | null;
};

export type SplitType = "full_body" | "upper_lower" | "ppl";

export type Program = {
  id: string;
  user_id: string;
  name: string;
  split_type: SplitType;
  goal: Goal;
  frequency_per_week: number;
  rep_low: number;
  rep_high: number;
  set_low: number;
  set_high: number;
  includes_cardio: boolean;
  is_active: boolean;
  generated_meta: Record<string, unknown> | null;
  created_at: string;
};

export type ProgramExercise = {
  id: string;
  program_day_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_rep_low: number;
  target_rep_high: number;
  /** %1RM batas bawah/atas; null untuk bodyweight & kardio. */
  target_intensity_low: number | null;
  target_intensity_high: number | null;
  /** Reps-in-reserve (proksimitas ke kegagalan); null untuk kardio. */
  target_rir_low: number | null;
  target_rir_high: number | null;
  rest_seconds: number;
  notes: string | null;
  exercise?: Exercise;
};

export type ProgramDay = {
  id: string;
  program_id: string;
  day_index: number;
  label: string;
  focus: string | null;
  exercises?: ProgramExercise[];
};

// In-memory plan produced by the deterministic generator before persistence.
export type GeneratedExercise = {
  exercise_id: string;
  slug: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: EquipmentType;
  order_index: number;
  target_sets: number;
  target_rep_low: number;
  target_rep_high: number;
  target_intensity_low: number | null;
  target_intensity_high: number | null;
  target_rir_low: number | null;
  target_rir_high: number | null;
  rest_seconds: number;
  notes: string | null;
};

export type GeneratedDay = {
  day_index: number;
  label: string;
  focus: string | null;
  exercises: GeneratedExercise[];
};

export type GeneratedProgram = {
  name: string;
  split_type: SplitType;
  goal: Goal;
  frequency_per_week: number;
  rep_low: number;
  rep_high: number;
  set_low: number;
  set_high: number;
  includes_cardio: boolean;
  days: GeneratedDay[];
  generated_meta: {
    goal: Goal;
    level: ExperienceLevel;
    equipment: Equipment;
    frequency: number;
    injuries: string[];
    age: number | null;
    bmi: number | null;
    gender: Gender;
    target_deadline: string | null;
    low_impact: boolean;
    glute_emphasis: boolean;
  };
};
