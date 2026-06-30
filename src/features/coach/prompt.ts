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
  const profileBlock = f
    ? [
        `Nama: ${ctx.profile?.name ?? "-"}`,
        `Gender: ${f.gender ?? "-"}, Umur: ${f.age ?? "-"}, BB: ${f.weight_kg ?? "-"} kg, TB: ${f.height_cm ?? "-"} cm`,
        `Tujuan: ${f.goal ? GOAL_LABEL[f.goal] : "-"}, Level: ${f.experience_level ? LEVEL_LABEL[f.experience_level] : "-"}, Frekuensi: ${f.training_frequency ?? "-"}x/minggu`,
        `Alat: ${f.equipment ? EQUIPMENT_LABEL[f.equipment] : "-"}, Cedera: ${f.injuries?.length ? f.injuries.join(", ") : "tidak ada"}`,
        `Target kalori: ${f.daily_calorie_target ?? "-"} kkal, Protein: ${f.daily_protein_target_g ?? "-"} g/hari (protein hari ini: ${ctx.proteinToday} g)`,
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
  - Gunakan data profil, program, dan log di atas. Jangan mengarang data yang tidak ada.
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
