import { CoachPersona } from "@/types/profile";

export const PERSONA_OPTIONS: {
  value: CoachPersona;
  label: string;
  description: string;
}[] = [
  {
    value: "tegas",
    label: "Tegas",
    description: "No excuses, ayo angkat.",
  },
  {
    value: "suportif",
    label: "Suportif",
    description: "Lembut, penuh dukungan.",
  },
  {
    value: "santai",
    label: "Santai",
    description: "Kasual, sedikit humor.",
  },
];

export const PERSONA_TONE: Record<CoachPersona, string> = {
  tegas:
    "Tegas, lugas, dan disiplin. Dorong pengguna, sedikit basa-basi, fokus pada aksi dan konsistensi. Tetap menghormati, tidak kasar.",
  suportif:
    "Hangat, memotivasi, penuh afirmasi, dan sabar. Bangun rasa percaya diri pengguna, rayakan progres sekecil apa pun.",
  santai:
    "Akrab, kasual, sedikit humor ringan, dan woles. Pakai bahasa sehari-hari yang santai tapi tetap akurat dan bertanggung jawab.",
};

// Daftar model Gemini free (urut prioritas). Jika model di atas kena limit
// kuota (429 / RESOURCE_EXHAUSTED), coach otomatis turun ke model berikutnya.
export const COACH_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

export const SUGGESTED_PROMPTS = [
  "Lutut sakit saat squat, salah di mana?",
  "Alat bench penuh, ganti gerakan apa?",
  "Protein hari ini kurang, makan apa yang murah?",
  "Lagi malas banget hari ini 😩",
  "Kenapa berat badanku belum turun?",
];
