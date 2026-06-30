import { embedExercises, embedKnowledge } from "@/features/ai/embedding";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * One-time backfill of pgvector embeddings for seeded exercises + knowledge base.
 * Idempotent: only rows with embedding = null are processed. Requires an
 * authenticated session and GOOGLE_GEN_AI_API_KEY + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Trigger once after running the migrations:  POST /api/embeddings
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exercises = await embedExercises();
    const knowledge = await embedKnowledge();
    return NextResponse.json({ ok: true, exercises, knowledge });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Embedding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
