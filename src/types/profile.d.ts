export type CoachPersona = "tegas" | "suportif" | "santai";

export type Gender = "cowok" | "cewek" | "rahasia";

export type Goal =
  | "turun_lemak"
  | "naik_massa"
  | "toning"
  | "strength"
  | "kebugaran_umum"
  | "kesuburan";

export type ExperienceLevel = "pemula" | "menengah" | "mahir";

export type Equipment = "gym_lengkap" | "dumbbell_saja" | "rumah_tanpa_alat";

export type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  coach_persona: CoachPersona;
  onboarding_completed: boolean;
};

export type FitnessProfile = {
  user_id: string;
  gender: Gender | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  goal: Goal | null;
  experience_level: ExperienceLevel | null;
  training_frequency: number | null;
  equipment: Equipment | null;
  injuries: string[];
  target_deadline: string | null;
  tdee: number | null;
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
};

export type OnboardingAnswers = {
  gender: Gender;
  age: number;
  weight_kg: number;
  height_cm: number;
  goal: Goal;
  experience_level: ExperienceLevel;
  training_frequency: number;
  equipment: Equipment;
  injuries: string[];
  target_deadline: string | null;
};
