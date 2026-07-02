// One-off backfill: isi kolom `embedding` (null) di `exercises` + `knowledge_base`.
// Pakai service role key, jadi tidak perlu session login seperti POST /api/embeddings.
// Jalankan dari root project:  node scripts/backfill-embeddings.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const aiKey = env.GOOGLE_GEN_AI_API_KEY;
if (!url || !serviceKey || !aiKey) {
  console.error("Env kurang: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GOOGLE_GEN_AI_API_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const ai = new GoogleGenAI({ apiKey: aiKey });

async function embed(contents) {
  // Model & dimensi HARUS sama dengan src/features/ai/embedding.ts
  const res = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents,
    config: { outputDimensionality: 768 },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values) throw new Error("Failed to generate embedding");
  return values;
}

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tries) throw e;
      console.warn(`  retry ${i}/${tries - 1} untuk ${label}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function backfillExercises() {
  const { data: rows, error } = await supabase
    .from("exercises")
    .select("id, name, name_id, muscle_group, equipment, technique_steps")
    .is("embedding", null);
  if (error) throw error;
  console.log(`exercises tanpa embedding: ${rows.length}`);

  let updated = 0;
  for (const row of rows) {
    const text = JSON.stringify({
      name: row.name,
      name_id: row.name_id,
      muscle_group: row.muscle_group,
      equipment: row.equipment,
      technique: row.technique_steps,
    });
    const embedding = await withRetry(() => embed(text), row.name);
    const { error: upErr } = await supabase
      .from("exercises")
      .update({ embedding })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated += 1;
    console.log(`  [${updated}/${rows.length}] ${row.name}`);
  }
  return updated;
}

async function backfillKnowledge() {
  const { data: rows, error } = await supabase
    .from("knowledge_base")
    .select("id, title, content, category")
    .is("embedding", null);
  if (error) throw error;
  console.log(`knowledge tanpa embedding: ${rows.length}`);

  let updated = 0;
  for (const row of rows) {
    const embedding = await withRetry(
      () => embed(`${row.category}: ${row.title}\n${row.content}`),
      row.title,
    );
    const { error: upErr } = await supabase
      .from("knowledge_base")
      .update({ embedding })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated += 1;
    console.log(`  [${updated}/${rows.length}] ${row.title}`);
  }
  return updated;
}

const ex = await backfillExercises();
const kn = await backfillKnowledge();

const { count } = await supabase
  .from("exercises")
  .select("id", { count: "exact", head: true })
  .is("embedding", null);
console.log(`\nSelesai. exercises di-embed: ${ex}, knowledge di-embed: ${kn}. Sisa exercises null: ${count}`);
