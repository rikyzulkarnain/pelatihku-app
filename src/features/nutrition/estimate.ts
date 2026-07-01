"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createAI } from "@/features/ai/instance";
import { ALL_QUOTA_EXHAUSTED_MESSAGE, COACH_MODELS } from "@/constants/coach-constant";
import { Content } from "@google/genai";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const mealItemSchema = z.object({
  name: z.string(),
  portion: z.string(),
  protein_g: z.number().min(0),
  carb_g: z.number().min(0),
  fat_g: z.number().min(0),
  calories: z.number().min(0),
});

const mealSchema = z.object({
  items: z.array(mealItemSchema),
  reply: z.string(),
});

export type MealItem = z.infer<typeof mealItemSchema>;

export type MealResult = {
  error?: string;
  reply?: string;
  items?: MealItem[];
  totals?: { protein_g: number; carb_g: number; fat_g: number; calories: number };
  proteinNow?: number;
  carbNow?: number;
  fatNow?: number;
};

const PROMPT = `<role>
Kamu adalah ahli gizi untuk aplikasi fitness Indonesia. Tugasmu memperkirakan kandungan
makro dari makanan yang diceritakan pengguna (teks atau suara), lalu menjelaskannya singkat.
</role>
<instruction>
Identifikasi setiap makanan/minuman yang disebut pengguna beserta perkiraan porsinya.
Untuk setiap item, estimasi nilai gizi berdasarkan porsi umum di Indonesia (masakan rumahan).
Kembalikan JSON dengan struktur PERSIS berikut:
{
  "items": [
    {
      "name": "nama makanan (huruf pertama kapital, Bahasa Indonesia)",
      "portion": "porsi singkat, mis. '1 potong', '1 centong', '100 g'",
      "protein_g": number,   // gram protein, boleh desimal
      "carb_g": number,      // gram karbohidrat
      "fat_g": number,       // gram lemak
      "calories": number     // kkal total item ini
    }
  ],
  "reply": "kalimat ramah Bahasa Indonesia yang menyapa dan merangkum total makro (protein, karbo, lemak, kalori). Maksimal 2 kalimat, boleh 1 emoji."
}
Aturan:
- Jika porsi tidak disebut, asumsikan 1 porsi standar.
- Jika input tidak menyebut makanan sama sekali, kembalikan items kosong dan reply yang meminta pengguna menyebutkan makanannya.
- Angka wajar untuk makanan Indonesia (mis. nasi putih 1 centong ~150g ~40g karbo).
</instruction>
<outputFormat>
Balas HANYA objek JSON mentah. Tanpa blok markdown, tanpa teks sebelum/sesudah.
</outputFormat>`;

function isQuotaError(error: unknown): boolean {
  const err = error as { status?: number | string; code?: number; message?: string };
  const message = (err?.message ?? "").toLowerCase();
  return (
    err?.status === 429 ||
    err?.status === "RESOURCE_EXHAUSTED" ||
    err?.code === 429 ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("429")
  );
}

async function runModel(parts: Content["parts"]): Promise<string> {
  const ai = createAI();
  const contents: Content[] = [{ role: "user", parts }];

  let lastError: unknown;
  for (const model of COACH_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { temperature: 0.3, responseMimeType: "application/json" },
      });
      if (response.text) return response.text;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) continue;
      throw error;
    }
  }
  if (isQuotaError(lastError)) throw new Error(ALL_QUOTA_EXHAUSTED_MESSAGE);
  throw lastError ?? new Error("AI tidak dapat memproses makanan.");
}

/**
 * Estimasi makro dari deskripsi makanan (teks atau audio) lalu simpan ke nutrition_logs.
 * Audio dikirim sebagai base64 inlineData (mis. rekaman dari browser).
 */
export async function estimateAndLogMeal(input: {
  text?: string;
  audio?: { mimeType: string; base64: string };
}): Promise<MealResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir. Silakan login ulang." };

  const parts: Content["parts"] = [];
  if (input.audio) {
    parts.push({
      inlineData: { mimeType: input.audio.mimeType, data: input.audio.base64 },
    });
    parts.push({ text: "Makanan yang saya makan diceritakan pada audio ini." });
  }
  if (input.text?.trim()) {
    parts.push({ text: `Makanan yang saya makan: ${input.text.trim()}` });
  }
  parts.push({ text: PROMPT });

  if (parts.length === 1) return { error: "Ceritakan dulu makananmu ya." };

  let parsed: z.infer<typeof mealSchema>;
  try {
    const raw = await runModel(parts);
    parsed = mealSchema.parse(JSON.parse(raw));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memproses makanan.";
    return { error: msg };
  }

  if (parsed.items.length === 0) {
    return { reply: parsed.reply, items: [], totals: { protein_g: 0, carb_g: 0, fat_g: 0, calories: 0 } };
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const totals = parsed.items.reduce(
    (acc, it) => ({
      protein_g: acc.protein_g + it.protein_g,
      carb_g: acc.carb_g + it.carb_g,
      fat_g: acc.fat_g + it.fat_g,
      calories: acc.calories + it.calories,
    }),
    { protein_g: 0, carb_g: 0, fat_g: 0, calories: 0 },
  );

  const log_date = format(new Date(), "yyyy-MM-dd");
  const { error } = await supabase.from("nutrition_logs").insert(
    parsed.items.map((it) => ({
      user_id: user.id,
      log_date,
      food_name: it.name,
      protein_g: round1(it.protein_g),
      carb_g: round1(it.carb_g),
      fat_g: round1(it.fat_g),
      calories: Math.round(it.calories),
    })),
  );
  if (error) return { error: error.message };

  // Ambil ulang total hari ini agar progress bar akurat.
  const { data: today } = await supabase
    .from("nutrition_logs")
    .select("protein_g, carb_g, fat_g")
    .eq("user_id", user.id)
    .eq("log_date", log_date);

  const sum = (key: "protein_g" | "carb_g" | "fat_g") =>
    Math.round((today ?? []).reduce((a, r) => a + Number(r[key] ?? 0), 0));

  revalidatePath("/nutrition");
  revalidatePath("/home");

  return {
    reply: parsed.reply,
    items: parsed.items,
    totals: {
      protein_g: round1(totals.protein_g),
      carb_g: round1(totals.carb_g),
      fat_g: round1(totals.fat_g),
      calories: Math.round(totals.calories),
    },
    proteinNow: sum("protein_g"),
    carbNow: sum("carb_g"),
    fatNow: sum("fat_g"),
  };
}
