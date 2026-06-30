"use server";

import { createClient } from "@/lib/supabase/server";
import { createAI } from "./instance";

export async function generateEmbedding(contents: string) {
  const ai = createAI();

  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents,
    config: {
      outputDimensionality: 768,
    },
  });

  if (
    !response.embeddings ||
    response.embeddings.length === 0 ||
    !response.embeddings[0].values
  ) {
    throw new Error("Failed to generate embedding");
  }

  return response.embeddings[0].values;
}

export async function findKnowledge(
  query: string,
  match_threshold = 0.3,
  match_count = 5,
) {
  const supabase = await createClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: queryEmbedding,
    match_threshold,
    match_count,
  });

  if (error) return [];
  return data as {
    id: string;
    category: string;
    title: string;
    content: string;
    similarity: number;
  }[];
}

export async function matchExercises(
  query: string,
  match_threshold = 0.25,
  match_count = 10,
) {
  const supabase = await createClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_exercises", {
    query_embedding: queryEmbedding,
    match_threshold,
    match_count,
  });

  if (error) return [];
  return data as {
    id: string;
    name: string;
    muscle_group: string;
    equipment: string;
    level: string;
    similarity: number;
  }[];
}

// ---- one-off backfill actions (run once after seeding migrations) ----

export async function embedExercises(): Promise<{ updated: number }> {
  const supabase = await createClient({ isAdmin: true });
  const { data: rows } = await supabase
    .from("exercises")
    .select("id, name, name_id, muscle_group, equipment, technique_steps")
    .is("embedding", null);

  let updated = 0;
  for (const row of rows ?? []) {
    const text = JSON.stringify({
      name: row.name,
      name_id: row.name_id,
      muscle_group: row.muscle_group,
      equipment: row.equipment,
      technique: row.technique_steps,
    });
    const embedding = await generateEmbedding(text);
    await supabase.from("exercises").update({ embedding }).eq("id", row.id);
    updated += 1;
  }
  return { updated };
}

export async function embedKnowledge(): Promise<{ updated: number }> {
  const supabase = await createClient({ isAdmin: true });
  const { data: rows } = await supabase
    .from("knowledge_base")
    .select("id, title, content, category")
    .is("embedding", null);

  let updated = 0;
  for (const row of rows ?? []) {
    const text = `${row.category}: ${row.title}\n${row.content}`;
    const embedding = await generateEmbedding(text);
    await supabase.from("knowledge_base").update({ embedding }).eq("id", row.id);
    updated += 1;
  }
  return { updated };
}
