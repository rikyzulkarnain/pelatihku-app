"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createAI } from "@/features/ai/instance";
import {
  ALL_QUOTA_EXHAUSTED_MESSAGE,
  COACH_MODELS,
  CoachModel,
  DEFAULT_COACH_MODEL,
} from "@/constants/coach-constant";
import { GOAL_LABEL } from "@/constants/labels";
import { Type } from "@google/genai";
import { format } from "date-fns";

export type MealPlanItem = {
  food_name: string;
  portion: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  calories: number;
  reason: string;
};

export type MealPlan = {
  summary: string;
  meals: MealPlanItem[];
  avoid: { item: string; reason: string }[];
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "1-2 kalimat tegas Bahasa Indonesia: kondisi asupan hari ini vs target & progres, dan apa fokusnya.",
    },
    meals: {
      type: Type.ARRAY,
      description:
        "3-6 makanan/minuman yang sebaiknya dimakan HARI INI untuk menutup sisa target. Makanan lokal Indonesia yang murah & mudah didapat.",
      items: {
        type: Type.OBJECT,
        properties: {
          food_name: { type: Type.STRING, description: "Nama makanan + porsi ringkas, huruf pertama kapital." },
          portion: { type: Type.STRING, description: "Porsi, mis. '100 g', '2 butir', '1 gelas'." },
          protein_g: { type: Type.NUMBER },
          carb_g: { type: Type.NUMBER },
          fat_g: { type: Type.NUMBER },
          calories: { type: Type.NUMBER },
          reason: { type: Type.STRING, description: "Alasan singkat kenapa item ini (kaitkan ke sisa target/recovery)." },
        },
        required: ["food_name", "portion", "protein_g", "carb_g", "fat_g", "calories", "reason"],
      },
    },
    avoid: {
      type: Type.ARRAY,
      description:
        "2-4 makanan/minuman yang harus dihindari/dikurangi pengguna ini, spesifik ke kebiasaannya & tujuannya.",
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Dampaknya ke tujuan pengguna, tegas & singkat." },
        },
        required: ["item", "reason"],
      },
    },
  },
  required: ["summary", "meals", "avoid"],
};

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

const round1 = (n: unknown) => Math.round((Number(n) || 0) * 10) / 10;

/**
 * Susun rekomendasi asupan HARI INI dengan AI, berdasarkan sisa target makro,
 * progres berat badan, dan sesi latihan terakhir. Hasilnya daftar makanan
 * (bisa langsung dicatat ke log harian) + daftar yang harus dihindari.
 */
export async function generateMealPlan(input?: {
  model?: CoachModel;
}): Promise<{ error?: string; plan?: MealPlan }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir. Silakan login ulang." };

  const today = format(new Date(), "yyyy-MM-dd");
  const [{ data: fitness }, { data: foods }, { data: sessions }, { data: weights }] =
    await Promise.all([
      supabase
        .from("fitness_profiles")
        .select("goal, weight_kg, daily_calorie_target, daily_protein_target_g")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("nutrition_logs")
        .select("food_name, protein_g, carb_g, fat_g, calories")
        .eq("user_id", user.id)
        .eq("log_date", today),
      supabase
        .from("workout_sessions")
        .select("completed_at, total_volume, program_day:program_days(label)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(3),
      supabase
        .from("bodyweight_logs")
        .select("log_date, weight_kg")
        .eq("user_id", user.id)
        .order("log_date", { ascending: true })
        .limit(20),
    ]);

  const calTarget = fitness?.daily_calorie_target ?? 0;
  const proTarget = fitness?.daily_protein_target_g ?? 0;
  const remainingCal = Math.max(0, calTarget - proTarget * 4);
  const carbTarget = Math.round((remainingCal * 0.5) / 4);
  const fatTarget = Math.round((remainingCal * 0.5) / 9);

  const rows = foods ?? [];
  const sum = (k: "protein_g" | "carb_g" | "fat_g" | "calories") =>
    Math.round(rows.reduce((a, f) => a + Number(f[k] ?? 0), 0));
  const eaten = {
    calories: sum("calories"),
    protein: sum("protein_g"),
    carb: sum("carb_g"),
    fat: sum("fat_g"),
  };

  const sessionLines = (sessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => {
      const label =
        (s.program_day as unknown as { label?: string } | null)?.label ?? "Sesi";
      return `- ${format(new Date(s.completed_at as string), "d MMM")}: ${label}, volume ${Math.round(Number(s.total_volume ?? 0))} kg`;
    })
    .join("\n");

  const w = weights ?? [];
  const weightTrend =
    w.length >= 2
      ? `${w[0].weight_kg} kg (${w[0].log_date}) → ${w[w.length - 1].weight_kg} kg (${w[w.length - 1].log_date})`
      : fitness?.weight_kg
        ? `${fitness.weight_kg} kg (data tren belum cukup)`
        : "belum ada data";

  const prompt = `Kamu ahli gizi olahraga untuk aplikasi fitness Indonesia. Susun rekomendasi asupan untuk SISA HARI INI.

Profil:
- Tujuan: ${fitness?.goal ? (GOAL_LABEL[fitness.goal] ?? fitness.goal) : "kebugaran umum"}
- Berat & tren: ${weightTrend}
- Target harian: ${calTarget} kkal, protein ${proTarget} g, karbo ~${carbTarget} g, lemak ~${fatTarget} g

Sudah dimakan hari ini: ${rows.length ? rows.map((f) => f.food_name).join(", ") : "belum ada"}
Total termakan: ${eaten.calories} kkal, protein ${eaten.protein} g, karbo ${eaten.carb} g, lemak ${eaten.fat} g
SISA target: ${Math.max(0, calTarget - eaten.calories)} kkal, protein ${Math.max(0, proTarget - eaten.protein)} g, karbo ${Math.max(0, carbTarget - eaten.carb)} g, lemak ${Math.max(0, fatTarget - eaten.fat)} g

Sesi latihan terakhir:
${sessionLines || "- belum ada sesi selesai"}

Aturan:
- Rekomendasikan 3-6 item makanan lokal Indonesia yang murah & mudah didapat, total makronya kira-kira menutup SISA target (jangan melebihi sisa kalori secara signifikan).
- Prioritaskan protein bila sisa proteinnya masih besar; dukung recovery otot dari sesi latihan terakhir.
- Kalau target kalori sudah lewat, meals cukup 1-2 item ringan tinggi protein dan katakan di summary bahwa harus berhenti makan berat.
- "avoid": spesifik ke kebiasaan pengguna (lihat yang sudah dimakan) dan tujuannya — tegas, sebutkan dampaknya.
- Semua teks Bahasa Indonesia. Angka makro realistis per porsi.`;

  const ai = createAI();
  const preferred = input?.model ?? DEFAULT_COACH_MODEL;
  const models = [preferred, ...COACH_MODELS.filter((m) => m !== preferred)];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      const raw = response.text ?? "";
      const parsed = JSON.parse(raw) as MealPlan;
      if (!Array.isArray(parsed.meals)) throw new Error("Format AI tidak valid.");
      return {
        plan: {
          summary: String(parsed.summary ?? ""),
          meals: parsed.meals.slice(0, 6).map((m) => ({
            food_name: String(m.food_name ?? "Makanan"),
            portion: String(m.portion ?? ""),
            protein_g: round1(m.protein_g),
            carb_g: round1(m.carb_g),
            fat_g: round1(m.fat_g),
            calories: Math.round(Number(m.calories) || 0),
            reason: String(m.reason ?? ""),
          })),
          avoid: (parsed.avoid ?? []).slice(0, 4).map((a) => ({
            item: String(a.item ?? ""),
            reason: String(a.reason ?? ""),
          })),
        },
      };
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) continue;
      // JSON rusak / error lain: coba model berikutnya juga.
      continue;
    }
  }

  if (isQuotaError(lastError)) return { error: ALL_QUOTA_EXHAUSTED_MESSAGE };
  return { error: "Gagal menyusun rekomendasi. Coba lagi ya." };
}
