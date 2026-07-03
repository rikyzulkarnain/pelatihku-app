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
    "Tegas seperti pelatih profesional: to the point, disiplin tinggi, tanpa basa-basi. " +
    "Misi utamamu adalah SUKSESNYA latihan pengguna — tegur langsung kebiasaan yang merusak targetnya " +
    "(makanan/minuman tidak sehat, protein kurang, skip latihan, kurang tidur), sebutkan konsekuensinya secara konkret, " +
    "lalu tutup dengan perintah aksi yang jelas. Tetap menghormati, tidak menghina, tidak kasar.",
  suportif:
    "Hangat, memotivasi, penuh afirmasi, dan sabar. Bangun rasa percaya diri pengguna, rayakan progres sekecil apa pun.",
  santai:
    "Akrab, kasual, sedikit humor ringan, dan woles. Pakai bahasa sehari-hari yang santai tapi tetap akurat dan bertanggung jawab.",
};

// Daftar model Gemini free (urut prioritas). Jika model yang dipilih kena limit
// kuota (429 / RESOURCE_EXHAUSTED), coach otomatis turun ke model berikutnya.
export const COACH_MODELS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

export type CoachModel = (typeof COACH_MODELS)[number];

export const DEFAULT_COACH_MODEL: CoachModel = "gemini-3.5-flash";

// Label ringkas untuk selector model di UI.
export const COACH_MODEL_LABELS: Record<CoachModel, string> = {
  "gemini-3.5-flash": "3.5 Flash",
  "gemini-2.5-flash": "2.5 Flash",
  "gemini-2.5-flash-lite": "2.5 Flash Lite",
  "gemini-2.0-flash": "2.0 Flash",
  "gemini-2.0-flash-lite": "2.0 Flash Lite",
};

// Model yang mendukung thinking (thinkingConfig). Model 2.0 tidak mendukung.
export function supportsThinking(model: string): boolean {
  return model.startsWith("gemini-2.5") || model.startsWith("gemini-3");
}

// Kontak admin untuk minta token gratis baru saat semua kuota habis.
export const ADMIN_WHATSAPP = "082172282494";

// Pesan saat SEMUA model free kehabisan kuota.
export const ALL_QUOTA_EXHAUSTED_MESSAGE =
  `Semua model gratis sedang kehabisan kuota 😔. Coba ganti ke model lain lewat menu di atas. ` +
  `Kalau semuanya sudah habis, hubungi admin untuk generate token gratis lagi via WhatsApp ${ADMIN_WHATSAPP}.`;

export const SUGGESTED_PROMPTS = [
  "Lutut sakit saat squat, salah di mana?",
  "Alat bench penuh, ganti gerakan apa?",
  "Protein hari ini kurang, makan apa yang murah?",
  "Lagi malas banget hari ini 😩",
  "Kenapa berat badanku belum turun?",
];
