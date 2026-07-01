"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createAI } from "@/features/ai/instance";
import {
  ALL_QUOTA_EXHAUSTED_MESSAGE,
  COACH_MODELS,
} from "@/constants/coach-constant";
import {
  Content,
  FunctionCall,
  FunctionDeclaration,
  GenerateContentResponse,
  Part,
  Type,
} from "@google/genai";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export type MacroTotals = {
  protein_g: number;
  carb_g: number;
  fat_g: number;
  calories: number;
};

export type LoggedFood = {
  id: string;
  food_name: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  calories: number;
};

export type NutritionChatResult = {
  error?: string;
  reply?: string;
  logs?: LoggedFood[];
  totals?: MacroTotals;
  /** true jika AI melakukan perubahan (tambah/ubah/hapus) pada catatan. */
  changed?: boolean;
};

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

// ---- Function declarations (dipahami Gemini) -----------------------------

const macroProps = {
  food_name: {
    type: Type.STRING,
    description: "Nama makanan/minuman, huruf pertama kapital, Bahasa Indonesia.",
  },
  protein_g: { type: Type.NUMBER, description: "Gram protein (boleh desimal)." },
  carb_g: { type: Type.NUMBER, description: "Gram karbohidrat (boleh desimal)." },
  fat_g: { type: Type.NUMBER, description: "Gram lemak (boleh desimal)." },
  calories: { type: Type.NUMBER, description: "Total kalori item ini (kkal)." },
};

const logFoodDeclaration: FunctionDeclaration = {
  name: "log_food",
  description:
    "Catat SATU makanan/minuman yang dimakan pengguna hari ini beserta estimasi makronya. Panggil sekali untuk tiap item.",
  parameters: {
    type: Type.OBJECT,
    properties: macroProps,
    required: ["food_name", "protein_g", "carb_g", "fat_g", "calories"],
  },
};

const updateFoodDeclaration: FunctionDeclaration = {
  name: "update_food",
  description:
    "Perbarui entri makanan yang SUDAH tercatat hari ini (mis. koreksi porsi/makro atau ganti nama). Wajib pakai id dari daftar makanan hari ini. Hanya isi field yang perlu diubah.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "id entri yang akan diubah." },
      ...macroProps,
    },
    required: ["id"],
  },
};

const deleteFoodDeclaration: FunctionDeclaration = {
  name: "delete_food",
  description:
    "Hapus entri makanan yang sudah tercatat hari ini. Wajib pakai id dari daftar makanan hari ini.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "id entri yang akan dihapus." },
    },
    required: ["id"],
  },
};

const DECLARATIONS = [
  logFoodDeclaration,
  updateFoodDeclaration,
  deleteFoodDeclaration,
];

function buildSystemInstruction(logs: LoggedFood[]): string {
  const list = logs.length
    ? logs
        .map(
          (l) =>
            `- id=${l.id} | ${l.food_name} | ${l.protein_g}g protein, ${l.carb_g}g karbo, ${l.fat_g}g lemak, ${l.calories} kkal`,
        )
        .join("\n")
    : "(belum ada catatan hari ini)";

  return `Kamu adalah asisten gizi untuk aplikasi fitness Indonesia "Pelatihku".
Tugasmu: memahami makanan/minuman dari teks, pesan suara, atau foto (makanan maupun struk belanja),
memperkirakan makro (protein, karbohidrat, lemak, kalori) untuk porsi umum di Indonesia,
lalu MENCATAT, MENGUBAH, atau MENGHAPUS entri lewat function calls yang tersedia.

Aturan:
- Untuk tiap makanan baru yang dimakan pengguna, panggil log_food (sekali per item).
- Jika pengguna minta mengoreksi/mengubah entri yang sudah ada, panggil update_food dengan id yang tepat.
- Jika pengguna minta menghapus entri, panggil delete_food dengan id yang tepat.
- Cocokkan nama yang disebut pengguna dengan daftar entri hari ini untuk menemukan id-nya.
- Estimasi angka wajar untuk masakan Indonesia (mis. nasi putih 1 centong ~150g, ~40g karbo, ~200 kkal).
- Jika porsi tidak disebut, asumsikan 1 porsi standar.
- Foto makanan: identifikasi SEMUA makanan di piring. Foto struk: ambil item makanan/minuman beserta jumlahnya.
- Jika input tidak menyebut/menampilkan makanan sama sekali, JANGAN panggil function apa pun; balas ramah minta pengguna menyebutkan makanannya.
- Setelah aksi, balas 1-2 kalimat Bahasa Indonesia yang ramah, merangkum apa yang dicatat/diubah/dihapus. Boleh 1 emoji. Jangan pakai tabel atau markdown rumit.

Catatan makanan hari ini (pakai id untuk update_food / delete_food):
${list}`;
}

function isQuotaError(error: unknown): boolean {
  const err = error as {
    status?: number | string;
    code?: number;
    message?: string;
  };
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

async function callModel(
  contents: Content[],
  systemInstruction: string,
): Promise<GenerateContentResponse> {
  const ai = createAI();
  let lastError: unknown;
  for (const model of COACH_MODELS) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config: {
          temperature: 0.3,
          systemInstruction,
          tools: [{ functionDeclarations: DECLARATIONS }],
        },
      });
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) continue;
      throw error;
    }
  }
  if (isQuotaError(lastError)) throw new Error(ALL_QUOTA_EXHAUSTED_MESSAGE);
  throw lastError ?? new Error("AI tidak dapat memproses makanan.");
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function executeFunctionCall(
  supabase: Supabase,
  userId: string,
  logDate: string,
  fc: FunctionCall,
): Promise<Record<string, unknown>> {
  const args = (fc.args ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (v === undefined || v === null ? undefined : round1(v as number));

  switch (fc.name) {
    case "log_food": {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .insert({
          user_id: userId,
          log_date: logDate,
          food_name: String(args.food_name ?? "Makanan"),
          protein_g: round1(args.protein_g as number),
          carb_g: round1(args.carb_g as number),
          fat_g: round1(args.fat_g as number),
          calories: Math.round(Number(args.calories) || 0),
        })
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, id: data.id, food_name: args.food_name };
    }

    case "update_food": {
      const id = String(args.id ?? "");
      if (!id) return { success: false, error: "id tidak diberikan" };
      const patch: Record<string, unknown> = {};
      if (args.food_name !== undefined) patch.food_name = String(args.food_name);
      if (args.protein_g !== undefined) patch.protein_g = num(args.protein_g);
      if (args.carb_g !== undefined) patch.carb_g = num(args.carb_g);
      if (args.fat_g !== undefined) patch.fat_g = num(args.fat_g);
      if (args.calories !== undefined)
        patch.calories = Math.round(Number(args.calories) || 0);
      if (Object.keys(patch).length === 0)
        return { success: false, error: "tidak ada perubahan" };
      const { error } = await supabase
        .from("nutrition_logs")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { success: false, error: error.message };
      return { success: true, id };
    }

    case "delete_food": {
      const id = String(args.id ?? "");
      if (!id) return { success: false, error: "id tidak diberikan" };
      const { error } = await supabase
        .from("nutrition_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { success: false, error: error.message };
      return { success: true, id };
    }

    default:
      return { success: false, error: `fungsi tidak dikenal: ${fc.name}` };
  }
}

async function fetchToday(
  supabase: Supabase,
  userId: string,
  logDate: string,
): Promise<LoggedFood[]> {
  const { data } = await supabase
    .from("nutrition_logs")
    .select("id, food_name, protein_g, carb_g, fat_g, calories")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .order("created_at", { ascending: false });

  return (data ?? []).map((l) => ({
    id: l.id,
    food_name: l.food_name,
    protein_g: round1(l.protein_g),
    carb_g: round1(l.carb_g),
    fat_g: round1(l.fat_g),
    calories: Math.round(Number(l.calories) || 0),
  }));
}

function sumTotals(logs: LoggedFood[]): MacroTotals {
  const t = logs.reduce(
    (acc, l) => ({
      protein_g: acc.protein_g + l.protein_g,
      carb_g: acc.carb_g + l.carb_g,
      fat_g: acc.fat_g + l.fat_g,
      calories: acc.calories + l.calories,
    }),
    { protein_g: 0, carb_g: 0, fat_g: 0, calories: 0 },
  );
  return {
    protein_g: round1(t.protein_g),
    carb_g: round1(t.carb_g),
    fat_g: round1(t.fat_g),
    calories: Math.round(t.calories),
  };
}

/**
 * Chat gizi multimodal dengan function calling. Bisa menerima teks, pesan
 * suara (audio base64), dan/atau foto makanan/struk (image base64). AI dapat
 * mencatat, mengubah, atau menghapus entri makanan hari ini.
 */
export async function nutritionChat(input: {
  text?: string;
  audio?: { mimeType: string; base64: string };
  image?: { mimeType: string; base64: string };
}): Promise<NutritionChatResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir. Silakan login ulang." };

  const logDate = format(new Date(), "yyyy-MM-dd");
  const before = await fetchToday(supabase, user.id, logDate);

  const parts: Part[] = [];
  if (input.audio)
    parts.push({
      inlineData: { mimeType: input.audio.mimeType, data: input.audio.base64 },
    });
  if (input.image)
    parts.push({
      inlineData: { mimeType: input.image.mimeType, data: input.image.base64 },
    });
  if (input.text?.trim()) parts.push({ text: input.text.trim() });

  if (parts.length === 0) return { error: "Ceritakan atau foto dulu makananmu ya." };
  if (input.audio && !input.text?.trim())
    parts.push({
      text: "(Pesan suara) Dengarkan audio ini dan proses makanan yang disebutkan.",
    });
  if (input.image && !input.text?.trim())
    parts.push({
      text: "(Foto) Identifikasi makanan pada gambar ini (bisa berupa makanan atau struk) lalu catat.",
    });

  const systemInstruction = buildSystemInstruction(before);
  const contents: Content[] = [{ role: "user", parts }];

  let reply = "";
  let changed = false;
  try {
    for (let turn = 0; turn < 5; turn++) {
      const response = await callModel(contents, systemInstruction);
      const respParts = response.candidates?.[0]?.content?.parts ?? [];
      const functionCalls: FunctionCall[] = [];
      const modelParts: Part[] = [];

      for (const part of respParts) {
        modelParts.push(part);
        if (part.functionCall) functionCalls.push(part.functionCall);
        else if (part.text) reply += part.text;
      }

      if (functionCalls.length === 0) break;
      changed = true;

      contents.push({ role: "model", parts: modelParts });
      const responseParts: Part[] = [];
      for (const fc of functionCalls) {
        const result = await executeFunctionCall(supabase, user.id, logDate, fc);
        responseParts.push({
          functionResponse: { name: fc.name ?? "", id: fc.id, response: { result } },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal memproses makanan." };
  }

  const logs = changed ? await fetchToday(supabase, user.id, logDate) : before;
  const totals = sumTotals(logs);

  if (changed) {
    revalidatePath("/nutrition");
    revalidatePath("/home");
  }

  return {
    reply: reply.trim() || (changed ? "Oke, sudah aku catat ✅" : "Boleh, ceritakan makananmu ya."),
    logs,
    totals,
    changed,
  };
}
