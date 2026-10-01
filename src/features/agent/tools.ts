// Tools milik lead agent — padanan `services.py` di proyek mentor.
// Tiap tool = deklarasi fungsi (dibaca Gemini untuk memilih) + implementasi.
// Sebagian besar tool adalah sub-agent: memanggil Gemini lagi dengan
// instruksi & data spesialisnya sendiri, lalu hasilnya dikirim APA ADANYA.

import { CoachModel, supportsThinking } from "@/constants/coach-constant";
import { GOAL_LABEL, LEVEL_LABEL } from "@/constants/labels";
import { findKnowledge } from "@/features/ai/embedding";
import { generateWithFallback } from "@/features/ai/generate";
import { getCoachContext } from "@/features/coach/context";
import { buildCoachSystemInstruction } from "@/features/coach/prompt";
import { nutritionChat } from "@/features/nutrition/chat";
import { generateMealPlan } from "@/features/nutrition/recommend";
import { getActiveProgram } from "@/features/program/action";
import {
  getSwapCandidates,
  recommendExercise,
  setExerciseOverride,
} from "@/features/program/override";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Exercise } from "@/types/program";
import {
  Content,
  FunctionDeclaration,
  HarmBlockThreshold,
  HarmCategory,
  Type,
} from "@google/genai";
import { format, startOfDay, subDays } from "date-fns";
import { PROGRESS_REPORT_INSTRUCTION } from "./instructions/progress-report";

export type ToolContext = {
  /** Riwayat percakapan, diakhiri pesan terbaru pengguna. */
  history: Content[];
  model: CoachModel;
  thinking: boolean;
};

export type ToolResult = { text: string; thought?: string };

export type AgentTool = {
  declaration: FunctionDeclaration;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");

export function lastUserText(history: Content[]): string {
  const last = [...history].reverse().find((c) => c.role === "user");
  return (last?.parts ?? []).map((p) => p.text ?? "").join(" ").trim();
}

// ── Helper latihan hari ini ─────────────────────────────────────────────

type DaySlot = { id: string; exercise: Exercise };
type WorkoutDay = { label: string; exercises: DaySlot[] };

const NO_PROGRAM_TEXT =
  "Kamu belum punya program latihan aktif, jadi belum ada gerakan yang bisa diganti. Buat program dulu di tab **Latihan** ya.";

/** Latihan berikutnya = hari berikutnya dalam rotasi program (sama dengan Beranda). */
async function getNextWorkoutDay(): Promise<WorkoutDay | null> {
  const program = await getActiveProgram();
  if (!program || program.days.length === 0) return null;

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { count } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  return program.days[(count ?? 0) % program.days.length];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type NamesOf<T> = (item: T) => (string | null | undefined)[];

const keysOf = <T>(item: T, names: NamesOf<T>) =>
  names(item)
    .map((n) => norm(n ?? ""))
    .filter(Boolean);

/**
 * Cocokkan per kata (≥4 huruf): pilih item yang namanya memuat kata terbanyak.
 * Hanya kalau pemenangnya tunggal, supaya kata umum seperti "press" tidak
 * asal menebak. Aman untuk kalimat utuh ("alat bench penuh" → Bench Press).
 */
function matchByWords<T>(items: T[], text: string, names: NamesOf<T>): T | undefined {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  if (words.length === 0) return undefined;

  const scored = items.map((item) => {
    const keys = keysOf(item, names);
    return { item, score: words.filter((w) => keys.some((k) => k.includes(w))).length };
  });
  const best = Math.max(0, ...scored.map((s) => s.score));
  const winners = scored.filter((s) => s.score === best);
  return best > 0 && winners.length === 1 ? winners[0].item : undefined;
}

/**
 * Cocokkan nama gerakan: sama persis dulu, lalu yang mengandung, terakhir
 * per kata. Kalau ambigu (mis. "press" cocok ke dua gerakan) → undefined,
 * biar user ditanya ulang alih-alih salah ganti.
 */
function matchByName<T>(items: T[], query: string, names: NamesOf<T>): T | undefined {
  const q = norm(query);
  if (!q) return undefined;

  const exact = items.find((item) => keysOf(item, names).includes(q));
  if (exact) return exact;

  const partial = items.filter((item) =>
    keysOf(item, names).some((k) => k.includes(q) || q.includes(k)),
  );
  if (partial.length > 1) return undefined;
  return partial[0] ?? matchByWords(items, query, names);
}

const slotNames = (pe: DaySlot) => [
  pe.exercise.name,
  pe.exercise.name_id,
  pe.exercise.slug,
];

function askWhichExercise(day: WorkoutDay, query: string): string {
  const list = day.exercises
    .map((pe, i) => `${i + 1}. ${pe.exercise.name}`)
    .join("\n");
  const opening = query
    ? `Gerakan "${query}" tidak ada di latihan berikutnya.`
    : "Gerakan mana yang mau diganti?";
  return `${opening} Latihan berikutnya (**${day.label}**):\n\n${list}\n\nSebutkan nama gerakannya ya.`;
}

// ── Tools ───────────────────────────────────────────────────────────────

const answerQuestion: AgentTool = {
  declaration: {
    name: "answer_question",
    description:
      "Sub-agent coach: menjawab pertanyaan fitness (teknik, cedera/nyeri, recovery, nutrisi umum, motivasi) memakai profil, program, log latihan, asupan hari ini, dan knowledge base.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: {
          type: Type.STRING,
          description:
            "Pertanyaan pengguna yang berdiri sendiri (sudah dilengkapi konteks percakapan sebelumnya).",
        },
      },
      required: ["question"],
    },
  },
  async run(args, ctx) {
    const question = str(args.question) || lastUserText(ctx.history);

    const [coachCtx, knowledge] = await Promise.all([
      getCoachContext(),
      findKnowledge(question, 0.3, 5).catch(() => []),
    ]);

    // Coach bernada TEGAS: fokus pada suksesnya latihan pengguna,
    // menegur langsung kebiasaan yang merusak target.
    const systemInstruction = buildCoachSystemInstruction(
      coachCtx,
      "tegas",
      knowledge,
    );

    const response = await generateWithFallback(ctx.model, (model) => ({
      model,
      contents: ctx.history,
      config: {
        systemInstruction,
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 1024,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
        // thinkingBudget: 0 mematikan thinking; hanya berlaku untuk model 2.5/3.
        // includeThoughts: true membuat alur berpikir ikut dikembalikan (parts.thought).
        ...(supportsThinking(model)
          ? {
              thinkingConfig: {
                includeThoughts: ctx.thinking,
                thinkingBudget: ctx.thinking ? -1 : 0,
              },
            }
          : {}),
      },
    }));

    let text = "";
    let thought = "";
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (!part.text) continue;
      if (part.thought) thought += part.text;
      else text += part.text;
    }

    return {
      text:
        text.trim() ||
        "Maaf, aku belum bisa menjawab itu. Coba tanya hal lain seputar latihanmu ya.",
      thought: thought.trim() || undefined,
    };
  },
};

const manageFoodLog: AgentTool = {
  declaration: {
    name: "manage_food_log",
    description:
      "Sub-agent gizi: mencatat makanan/minuman yang SUDAH dimakan pengguna hari ini (estimasi makro otomatis), atau mengoreksi/menghapus catatan makan hari ini.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        request: {
          type: Type.STRING,
          description:
            "Pesan pengguna apa adanya, lengkap dengan nama makanan, porsi, dan jumlahnya.",
        },
      },
      required: ["request"],
    },
  },
  async run(args, ctx) {
    const request = str(args.request) || lastUserText(ctx.history);
    const res = await nutritionChat({ text: request, model: ctx.model });
    if (res.error) return { text: `⚠️ ${res.error}` };

    const lines = [res.reply ?? ""];
    if (res.items?.length) {
      lines.push(
        "",
        "**Tercatat:**",
        ...res.items.map(
          (i) =>
            `- ${i.food_name} — ${fmt(i.calories)} kkal · protein ${i.protein_g} g · karbo ${i.carb_g} g · lemak ${i.fat_g} g`,
        ),
      );
    }
    if (res.changed && res.totals) {
      const t = res.totals;
      lines.push(
        "",
        `**Total hari ini:** ${fmt(t.calories)} kkal · protein ${t.protein_g} g · karbo ${t.carb_g} g · lemak ${t.fat_g} g`,
      );
    }

    return { text: lines.join("\n").trim() };
  },
};

const recommendMealPlan: AgentTool = {
  declaration: {
    name: "recommend_meal_plan",
    description:
      "Sub-agent ahli gizi: menyusun rekomendasi menu untuk SISA HARI INI berdasarkan sisa target makro, tren berat badan, dan sesi latihan terakhir, plus daftar makanan yang harus dihindari.",
  },
  async run(_args, ctx) {
    const res = await generateMealPlan({ model: ctx.model });
    if (res.error || !res.plan) {
      return { text: `⚠️ ${res.error ?? "Gagal menyusun rekomendasi."}` };
    }

    const { summary, meals, avoid } = res.plan;
    const lines = [
      "### 🥗 Rekomendasi makan sisa hari ini",
      "",
      summary,
      "",
      "**Menu yang disarankan:**",
      ...meals.map(
        (m, i) =>
          `${i + 1}. **${m.food_name}** (${m.portion}) — ${fmt(m.calories)} kkal · protein ${m.protein_g} g · karbo ${m.carb_g} g · lemak ${m.fat_g} g\n   _${m.reason}_`,
      ),
    ];
    if (avoid.length) {
      lines.push(
        "",
        "**Kurangi / hindari:**",
        ...avoid.map((a) => `- **${a.item}** — ${a.reason}`),
      );
    }
    lines.push("", "Sudah dimakan? Bilang saja, nanti aku catat ke log nutrisimu.");

    return { text: lines.join("\n") };
  },
};

const recommendExerciseSwap: AgentTool = {
  declaration: {
    name: "recommend_exercise_swap",
    description:
      "Sub-agent personal trainer: merekomendasikan 1-3 gerakan pengganti (kategori sama, aman untuk cedera & alat pengguna) untuk satu gerakan di latihan berikutnya, berdasarkan track record latihan.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        exercise_name: {
          type: Type.STRING,
          description:
            "Nama gerakan yang ingin diganti, sesuai ucapan pengguna. Kosongkan jika tidak disebut.",
        },
        reason: {
          type: Type.STRING,
          description:
            "Alasan pengguna ingin mengganti (mis. alat penuh, bahu nyeri, bosan). Kosongkan jika tidak disebut.",
        },
      },
    },
  },
  async run(args, ctx) {
    const day = await getNextWorkoutDay();
    if (!day) return { text: NO_PROGRAM_TEXT };

    // Model kadang tidak mengisi exercise_name walau gerakannya disebut
    // ("alat bench penuh") — cari dari kalimat user per kata sebagai cadangan.
    const query = str(args.exercise_name);
    const slot = query
      ? matchByName(day.exercises, query, slotNames)
      : matchByWords(day.exercises, lastUserText(ctx.history), slotNames);
    if (!slot) return { text: askWhichExercise(day, query) };

    const res = await recommendExercise({
      programExerciseId: slot.id,
      model: ctx.model,
      userReason: str(args.reason) || undefined,
    });
    if (res.error || !res.recommendations) {
      return { text: `⚠️ ${res.error ?? "Gagal menyusun rekomendasi."}` };
    }

    return {
      text: [
        `### 🔄 Pengganti ${slot.exercise.name}`,
        `_Latihan berikutnya: ${day.label}_`,
        "",
        res.summary ?? "",
        "",
        ...res.recommendations.map(
          (r, i) => `${i + 1}. **${r.name}** — ${r.reason}`,
        ),
        "",
        `Balas misalnya **"pakai nomor 1"** untuk memasang penggantinya. Berlaku untuk latihan hari ini saja — program aslimu tidak berubah.`,
      ].join("\n"),
    };
  },
};

const applyExerciseSwap: AgentTool = {
  declaration: {
    name: "apply_exercise_swap",
    description:
      "Memasang gerakan pengganti yang SUDAH DISETUJUI pengguna untuk latihan hari ini (program asli tidak berubah). Hanya dipanggil setelah pengguna memilih salah satu rekomendasi.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        original_exercise: {
          type: Type.STRING,
          description: "Nama gerakan asli yang diganti, disalin dari rekomendasi sebelumnya.",
        },
        replacement_exercise: {
          type: Type.STRING,
          description: "Nama gerakan pengganti yang dipilih pengguna, disalin dari rekomendasi sebelumnya.",
        },
        reason: {
          type: Type.STRING,
          description: "Alasan singkat penggantian, disalin dari rekomendasi yang dipilih.",
        },
      },
      required: ["original_exercise", "replacement_exercise"],
    },
  },
  async run(args) {
    const day = await getNextWorkoutDay();
    if (!day) return { text: NO_PROGRAM_TEXT };

    const original = str(args.original_exercise);
    const slot = matchByName(day.exercises, original, slotNames);
    if (!slot) return { text: askWhichExercise(day, original) };

    // Pengganti harus ada di daftar kandidat yang aman (kategori sama,
    // sesuai alat/cedera/level) — jangan percaya nama dari model begitu saja.
    const swap = await getSwapCandidates(slot.id);
    if (swap.error) return { text: `⚠️ ${swap.error}` };

    const wanted = str(args.replacement_exercise);
    const replacement = matchByName(swap.candidates ?? [], wanted, (e) => [
      e.name,
      e.name_id,
      e.slug,
    ]);
    if (!replacement) {
      return {
        text: `"${wanted}" bukan pengganti yang aman atau sekategori untuk **${slot.exercise.name}**. Minta rekomendasi ulang ya.`,
      };
    }

    const res = await setExerciseOverride({
      programExerciseId: slot.id,
      replacementExerciseId: replacement.id,
      date: format(new Date(), "yyyy-MM-dd"),
      source: "ai",
      reason: str(args.reason) || undefined,
    });
    if (res.error) return { text: `⚠️ ${res.error}` };

    return {
      text: `✅ **${slot.exercise.name}** diganti **${replacement.name}** untuk latihan hari ini (${day.label}). Program aslimu tetap. Mulai latihannya dari tab **Beranda**!`,
    };
  },
};

const progressReport: AgentTool = {
  declaration: {
    name: "progress_report",
    description:
      "Sub-agent analis: membuat laporan progres (latihan, nutrisi, berat badan) untuk N hari terakhir, dibandingkan dengan target pengguna.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: {
          type: Type.INTEGER,
          description: "Rentang laporan dalam hari terakhir. Default 7, maksimal 90.",
        },
      },
    },
  },
  async run(args, ctx) {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return { text: "Sesi berakhir. Silakan login ulang." };

    const days = Math.min(90, Math.max(1, Math.round(Number(args.days) || 7)));
    const end = new Date();
    const start = startOfDay(subDays(end, days - 1));
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");

    const [
      { data: profile },
      { data: fitness },
      { data: program },
      { data: sessions },
      { data: weights },
      { data: foods },
    ] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      supabase
        .from("fitness_profiles")
        .select("goal, experience_level, daily_calorie_target, daily_protein_target_g")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("programs")
        .select("name, frequency_per_week")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("completed_at, total_volume, program_day:program_days(label)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", start.toISOString())
        .order("completed_at", { ascending: true }),
      supabase
        .from("bodyweight_logs")
        .select("log_date, weight_kg")
        .eq("user_id", user.id)
        .gte("log_date", startDate)
        .order("log_date", { ascending: true }),
      supabase
        .from("nutrition_logs")
        .select("log_date, calories, protein_g")
        .eq("user_id", user.id)
        .gte("log_date", startDate),
    ]);

    const done = (sessions ?? []).filter((s) => s.completed_at);
    const weightRows = weights ?? [];
    const foodRows = foods ?? [];

    if (done.length === 0 && weightRows.length === 0 && foodRows.length === 0) {
      return {
        text: `Belum ada data latihan, makan, atau berat badan dalam ${days} hari terakhir. Selesaikan sesi latihan dan catat makanmu dulu, nanti laporannya bisa aku susun.`,
      };
    }

    const calTarget = fitness?.daily_calorie_target ?? 0;
    const proTarget = fitness?.daily_protein_target_g ?? 0;
    const freq = program?.frequency_per_week ?? 3;

    const totalVolume = done.reduce((a, s) => a + Number(s.total_volume ?? 0), 0);
    const sessionLines = done.map((s) => {
      const label =
        (s.program_day as unknown as { label?: string } | null)?.label ?? "Sesi";
      return `- ${format(new Date(s.completed_at as string), "yyyy-MM-dd")}: ${label}, volume ${fmt(Number(s.total_volume ?? 0))} kg`;
    });

    const perDay = new Map<string, { cal: number; pro: number }>();
    for (const f of foodRows) {
      const d = perDay.get(f.log_date) ?? { cal: 0, pro: 0 };
      d.cal += Number(f.calories ?? 0);
      d.pro += Number(f.protein_g ?? 0);
      perDay.set(f.log_date, d);
    }
    const loggedDays = [...perDay.values()];
    const avg = (k: "cal" | "pro") =>
      loggedDays.length
        ? loggedDays.reduce((a, d) => a + d[k], 0) / loggedDays.length
        : 0;
    const proteinHitDays = proTarget
      ? loggedDays.filter((d) => d.pro >= proTarget * 0.9).length
      : 0;

    const weightLines = weightRows.map((w) => `- ${w.log_date}: ${w.weight_kg} kg`);
    const weightDelta =
      weightRows.length >= 2
        ? Number(weightRows[weightRows.length - 1].weight_kg) -
          Number(weightRows[0].weight_kg)
        : null;

    const prompt = `Buat laporan progres untuk ${profile?.name ?? "pengguna"} periode ${startDate} s.d. ${endDate} (${days} hari).

Profil:
- Tujuan: ${fitness?.goal ? (GOAL_LABEL[fitness.goal] ?? fitness.goal) : "kebugaran umum"}
- Level: ${fitness?.experience_level ? (LEVEL_LABEL[fitness.experience_level] ?? fitness.experience_level) : "-"}
- Target harian: ${calTarget || "-"} kkal, protein ${proTarget || "-"} g
- Program aktif: ${program?.name ?? "belum ada"}, target ${freq}x/minggu (≈${Math.round((freq * days) / 7)} sesi untuk periode ini)

Latihan — ${done.length} sesi selesai, total volume ${fmt(totalVolume)} kg:
${sessionLines.join("\n") || "- tidak ada sesi selesai"}

Nutrisi:
- Hari dengan catatan makan: ${loggedDays.length} dari ${days} hari
- Rata-rata per hari tercatat: ${fmt(avg("cal"))} kkal, protein ${fmt(avg("pro"))} g
- Hari protein tercapai (≥90% target): ${proteinHitDays}

Berat badan:
${weightLines.join("\n") || "- tidak ada catatan"}${
      weightDelta !== null
        ? `\n- Perubahan: ${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`
        : ""
    }`;

    const response = await generateWithFallback(ctx.model, (model) => ({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: PROGRESS_REPORT_INSTRUCTION,
        temperature: 0.4,
      },
    }));

    return {
      text: response.text?.trim() || "⚠️ Gagal menyusun laporan. Coba lagi ya.",
    };
  },
};

const chitChat: AgentTool = {
  declaration: {
    name: "chit_chat",
    description:
      "Membalas sapaan, ucapan terima kasih, basa-basi singkat, atau menolak topik di luar fitness. Isi `reply` dengan jawaban lengkap Bahasa Indonesia format Markdown.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: "Jawaban lengkap untuk pengguna." },
      },
      required: ["reply"],
    },
  },
  async run(args) {
    return { text: str(args.reply) || "Siap! Ada yang bisa aku bantu soal latihanmu?" };
  },
};

export const AGENT_TOOLS: AgentTool[] = [
  answerQuestion,
  manageFoodLog,
  recommendMealPlan,
  recommendExerciseSwap,
  applyExerciseSwap,
  progressReport,
  chitChat,
];
