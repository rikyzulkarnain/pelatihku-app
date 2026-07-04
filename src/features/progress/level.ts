import { ExperienceLevel } from "@/types/profile";

export type LevelTarget = {
  current: ExperienceLevel;
  next: ExperienceLevel | null;
  /**
   * Minggu KONSISTEN (≥2 sesi/minggu) yang dibutuhkan untuk naik level.
   * Standar kepelatihan (NSCA/ACSM): pemula → menengah ±6 bulan latihan
   * konsisten; menengah → mahir ±2 tahun. Ini soal jam terbang tubuh
   * beradaptasi — TIDAK terkait target deadline yang dipilih di onboarding.
   */
  weeksRequired: number;
  /** Kriteria kualitatif yang harus dipenuhi, untuk ditampilkan sebagai poin. */
  criteria: string[];
};

const TARGETS: Record<ExperienceLevel, LevelTarget> = {
  pemula: {
    current: "pemula",
    next: "menengah",
    weeksRequired: 24, // ±6 bulan
    criteria: [
      "24 minggu latihan konsisten (minimal 2 sesi per minggu)",
      "Kuasai teknik gerakan dasar: squat, hinge, push, pull",
      "Beban naik bertahap tiap 1-2 minggu (progressive overload masih linear)",
    ],
  },
  menengah: {
    current: "menengah",
    next: "mahir",
    weeksRequired: 96, // ±2 tahun
    criteria: [
      "±2 tahun (96 minggu) latihan konsisten sejak mulai",
      "Progres beban sudah per bulan, bukan per sesi — butuh program terperiodisasi",
      "Mampu mengatur volume, intensitas, deload, dan recovery sendiri",
    ],
  },
  mahir: {
    current: "mahir",
    next: null,
    weeksRequired: 0,
    criteria: [
      "Pertahankan konsistensi — level tertinggi dinilai dari kualitas, bukan angka",
      "Jaga teknik tetap bersih saat beban makin berat",
      "Bantu tubuhmu: tidur cukup, protein terpenuhi, deload berkala",
    ],
  },
};

export function nextLevelTarget(level: ExperienceLevel | null): LevelTarget {
  return TARGETS[level ?? "pemula"];
}
