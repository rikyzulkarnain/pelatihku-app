import {
  Equipment,
  ExperienceLevel,
  Gender,
  Goal,
  OnboardingAnswers,
} from "@/types/profile";

export type OnboardingQuestion =
  | {
      key: keyof OnboardingAnswers;
      type: "choice";
      kicker: string;
      question: string;
      sub: string;
      options: { value: string; label: string }[];
    }
  | {
      key: keyof OnboardingAnswers;
      type: "multichoice";
      kicker: string;
      question: string;
      sub: string;
      options: { value: string; label: string }[];
      optional?: boolean;
    }
  | {
      key: keyof OnboardingAnswers;
      type: "number";
      kicker: string;
      question: string;
      sub: string;
      unit: string;
      min: number;
      max: number;
      step: number;
      default: number;
    };

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "cowok", label: "Cowok" },
  { value: "cewek", label: "Cewek" },
  { value: "rahasia", label: "Memilih tidak menyebut" },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "turun_lemak", label: "Turun lemak / kurus" },
  { value: "naik_massa", label: "Naik massa otot / berisi" },
  { value: "toning", label: "Bentuk & kencangkan tubuh" },
  { value: "strength", label: "Kekuatan (strength)" },
  { value: "kebugaran_umum", label: "Kebugaran umum & sehat" },
];

export const LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "pemula", label: "Pemula" },
  { value: "menengah", label: "Menengah" },
  { value: "mahir", label: "Mahir" },
];

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "gym_lengkap", label: "Gym lengkap" },
  { value: "dumbbell_saja", label: "Dumbbell saja" },
  { value: "rumah_tanpa_alat", label: "Di rumah tanpa alat" },
];

export const INJURY_OPTIONS = [
  { value: "lutut", label: "Lutut" },
  { value: "punggung_bawah", label: "Punggung bawah" },
  { value: "bahu", label: "Bahu" },
  { value: "siku", label: "Siku" },
  { value: "pergelangan_tangan", label: "Pergelangan tangan" },
];

export const FREQUENCY_OPTIONS = [2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n} hari / minggu`,
}));

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: "gender",
    type: "choice",
    kicker: "Tentang kamu",
    question: "Jenis kelamin kamu?",
    sub: "Untuk menyesuaikan estimasi kalori & bahasa coach.",
    options: GENDER_OPTIONS,
  },
  {
    key: "age",
    type: "number",
    kicker: "Tentang kamu",
    question: "Berapa umurmu?",
    sub: "Geser untuk pilih umurmu.",
    unit: "tahun",
    min: 12,
    max: 80,
    step: 1,
    default: 24,
  },
  {
    key: "weight_kg",
    type: "number",
    kicker: "Tentang kamu",
    question: "Berat badanmu sekarang?",
    sub: "Dipakai menghitung kebutuhan kalori & protein.",
    unit: "kg",
    min: 35,
    max: 200,
    step: 1,
    default: 65,
  },
  {
    key: "height_cm",
    type: "number",
    kicker: "Tentang kamu",
    question: "Tinggi badanmu?",
    sub: "Untuk hitung BMI & kebutuhan kalori.",
    unit: "cm",
    min: 130,
    max: 220,
    step: 1,
    default: 170,
  },
  {
    key: "goal",
    type: "choice",
    kicker: "Tujuanmu",
    question: "Apa tujuan utamamu?",
    sub: "Pilih satu yang paling penting buatmu.",
    options: GOAL_OPTIONS,
  },
  {
    key: "experience_level",
    type: "choice",
    kicker: "Pengalaman",
    question: "Sejauh mana pengalamanmu?",
    sub: "Supaya program & beban awal pas.",
    options: LEVEL_OPTIONS,
  },
  {
    key: "training_frequency",
    type: "choice",
    kicker: "Komitmen",
    question: "Berapa hari kamu sanggup latihan?",
    sub: "Per minggu. Jujur saja, biar konsisten.",
    options: FREQUENCY_OPTIONS,
  },
  {
    key: "equipment",
    type: "choice",
    kicker: "Akses alat",
    question: "Kamu latihan pakai apa?",
    sub: "Program menyesuaikan alat yang kamu punya.",
    options: EQUIPMENT_OPTIONS,
  },
  {
    key: "injuries",
    type: "multichoice",
    kicker: "Keamanan",
    question: "Ada cedera atau keluhan?",
    sub: "Opsional. Kami hindari gerakan berisiko. Pilih yang sesuai.",
    options: INJURY_OPTIONS,
    optional: true,
  },
  {
    key: "target_deadline",
    type: "choice",
    kicker: "Target waktu",
    question: "Punya target waktu?",
    sub: "Opsional. Membantu menjaga ritme.",
    options: [
      { value: "none", label: "Belum ada, santai saja" },
      { value: "1m", label: "Dalam 1 bulan" },
      { value: "3m", label: "Dalam 3 bulan" },
      { value: "6m", label: "Dalam 6 bulan" },
    ],
  },
];
