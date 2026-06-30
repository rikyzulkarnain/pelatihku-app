"use server";

import { createClient } from "@/lib/supabase/server";
import { matchExercises } from "@/features/ai/embedding";
import { Exercise } from "@/types/program";

export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("muscle_group", { ascending: true })
    .order("name", { ascending: true })
    .returns<Exercise[]>();
  return data ?? [];
}

/**
 * Semantic search over the exercise library (pgvector match_exercises), with a
 * substring fallback so it still works before embeddings are backfilled.
 * Returns ordered exercise ids.
 */
export async function searchExercises(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const ids: string[] = [];

  try {
    const semantic = await matchExercises(trimmed, 0.25, 12);
    for (const row of semantic) ids.push(row.id);
  } catch {
    // embeddings/key unavailable — fall back below
  }

  const supabase = await createClient();
  const { data: textMatches } = await supabase
    .from("exercises")
    .select("id")
    .or(`name.ilike.%${trimmed}%,name_id.ilike.%${trimmed}%,muscle_group.ilike.%${trimmed}%`)
    .limit(20);

  for (const row of textMatches ?? []) {
    if (!ids.includes(row.id)) ids.push(row.id);
  }

  return ids;
}
