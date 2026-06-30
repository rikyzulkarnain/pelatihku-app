export type SessionStatus = "in_progress" | "completed" | "skipped";

export type WorkoutSession = {
  id: string;
  user_id: string;
  program_id: string | null;
  program_day_id: string | null;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
  notes: string | null;
};

export type SetLog = {
  id: string;
  session_id: string;
  exercise_id: string;
  user_id: string;
  set_index: number;
  weight_kg: number;
  reps: number;
  is_warmup: boolean;
  rpe: number | null;
  created_at: string;
};

export type OverloadSuggestion = {
  weight_kg: number;
  reps: number;
  message: string | null;
};
