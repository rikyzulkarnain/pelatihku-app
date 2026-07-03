import { PERSONA_TONE } from "@/constants/coach-constant";
import { GOAL_LABEL, EQUIPMENT_LABEL, LEVEL_LABEL } from "@/constants/labels";
import { CoachPersona } from "@/types/profile";
import { CoachContext } from "./context";

export function buildCoachSystemInstruction(
  ctx: CoachContext,
  persona: CoachPersona,
  knowledge: { title: string; content: string }[],
): string {
  const f = ctx.fitness;

  // Target karbo & lemak diturunkan dari sisa kalori setelah protein (~50/50),
  // sama seperti di halaman Nutrisi, supaya angka konsisten.
  const calTarget = f?.daily_calorie_target ?? 0;
  const proTarget = f?.daily_protein_target_g ?? 0;
  const remaining = Math.max(0, calTarget - proTarget * 4);
  const carbTarget = Math.round((remaining * 0.5) / 4);
  const fatTarget = Math.round((remaining * 0.5) / 9);

  const nutritionBlock = [
    `Target harian: ${calTarget || "-"} kkal, protein ${proTarget || "-"} g, karbo ~${carbTarget || "-"} g, lemak ~${fatTarget || "-"} g`,
    `Asupan HARI INI: ${ctx.caloriesToday} kkal, protein ${ctx.proteinToday} g, karbo ${ctx.carbToday} g, lemak ${ctx.fatToday} g`,
    `Sisa hari ini: ${Math.max(0, calTarget - ctx.caloriesToday)} kkal, protein ${Math.max(0, proTarget - ctx.proteinToday)} g, karbo ${Math.max(0, carbTarget - ctx.carbToday)} g, lemak ${Math.max(0, fatTarget - ctx.fatToday)} g`,
    `Makanan tercatat hari ini: ${ctx.foodsToday.length ? ctx.foodsToday.join(", ") : "belum ada"}`,
  ].join("\n  ");

  const profileBlock = f
    ? [
        `Nama: ${ctx.profile?.name ?? "-"}`,
        `Gender: ${f.gender ?? "-"}, Umur: ${f.age ?? "-"}, BB: ${f.weight_kg ?? "-"} kg, TB: ${f.height_cm ?? "-"} cm`,
        `Tujuan: ${f.goal ? GOAL_LABEL[f.goal] : "-"}, Level: ${f.experience_level ? LEVEL_LABEL[f.experience_level] : "-"}, Frekuensi: ${f.training_frequency ?? "-"}x/minggu`,
        `Alat: ${f.equipment ? EQUIPMENT_LABEL[f.equipment] : "-"}, Cedera: ${f.injuries?.length ? f.injuries.join(", ") : "tidak ada"}`,
      ].join("\n  ")
    : "Profil belum lengkap.";

  const programBlock = ctx.programName
    ? `Program: ${ctx.programName} (${ctx.splitType}). Latihan berikutnya: ${ctx.todayLabel ?? "-"}${
        ctx.todayExercises.length
          ? ` — ${ctx.todayExercises.join(", ")}`
          : ""
      }.`
    : "Belum punya program aktif.";

  const logsBlock = ctx.recentSessions.length
    ? ctx.recentSessions
        .map((s) => `- ${s.date}: ${s.label}, total ${s.volume} kg`)
        .join("\n  ")
    : "Belum ada sesi tercatat.";

  const knowledgeBlock = knowledge.length
    ? knowledge.map((k) => `- ${k.title}: ${k.content}`).join("\n  ")
    : "(tidak ada referensi khusus)";

  return `<role>
Kamu adalah PelatihKu, AI personal trainer pribadi pengguna. ${PERSONA_TONE[persona]}
</role>

<user_profile>
  ${profileBlock}
</user_profile>

<nutrition_today>
  ${nutritionBlock}
</nutrition_today>

<current_program>
  ${programBlock}
</current_program>

<recent_logs>
  ${logsBlock}
  Streak saat ini: ${ctx.streak} hari.
</recent_logs>

<knowledge>
  ${knowledgeBlock}
</knowledge>

<instruction>
  - Jawab HANYA seputar fitness: latihan, teknik, nutrisi, recovery, dan motivasi.
  - Gunakan data profil, program, log, dan asupan gizi hari ini di atas. Jangan mengarang data yang tidak ada.
  - Kalau pengguna bertanya soal asupan/makan hari ini, jawab lengkap: kalori, protein, karbo, DAN lemak (bukan protein saja), termasuk sisa targetnya.
  - PROAKTIF soal makanan tidak sehat: periksa daftar "Makanan tercatat hari ini". Jika ada gorengan, minuman manis/bergula, junk food, mie instan, atau sejenisnya — TEGUR pengguna di awal jawaban meski tidak ditanya: sebutkan itemnya, dampaknya ke tujuannya, dan pengganti yang lebih baik, supaya dia tidak mengulanginya besok.
  - Jangan menormalisasi kebiasaan buruk demi menyenangkan pengguna. Katakan apa adanya, lalu beri solusi.
  - Jika menyarankan beban, dasarkan pada prinsip progressive overload dan log terakhir.
  - Hormati cedera pengguna: jangan sarankan gerakan yang berisiko untuk keluhannya.
  - Untuk keluhan serius / nyeri tajam, arahkan konsultasi ke tenaga medis. Jangan menjanjikan hasil instan.
  - Jawab dalam Bahasa Indonesia, ringkas, format markdown dengan bullet bila perlu. Sesuaikan nada dengan persona "${persona}".
</instruction>
<constraints>
  - Pertanyaan di luar fitness: tolak dengan sopan dan arahkan kembali ke topik latihan.
  - Hindari tabel; gunakan poin-poin singkat.
</constraints>`;
}
