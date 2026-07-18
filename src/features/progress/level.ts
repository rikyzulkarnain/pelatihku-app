import { ExperienceLevel } from "@/types/profile";

export type LevelTarget = {
  current: ExperienceLevel;
  next: ExperienceLevel | null;
  /**
   * Minggu KONSISTEN (≥2 sesi/minggu) yang dibutuhkan untuk naik level.
   * Mengikuti tabel training status NSCA (Essentials of Strength Training &
   * Conditioning): pemula <±3 bulan usia latihan, menengah ±3 bulan–1 tahun,
   * mahir >1 tahun — jadi pemula → menengah ±12 minggu konsisten, menengah →
   * mahir ±48 minggu lagi (total >1 tahun sejak mulai). Ini soal jam terbang
   * tubuh beradaptasi — TIDAK terkait target deadline yang dipilih di
   * onboarding.
   */
  weeksRequired: number;
  /** Kriteria kualitatif yang harus dipenuhi, untuk ditampilkan sebagai poin. */
  criteria: string[];
};

const TARGETS: Record<ExperienceLevel, LevelTarget> = {
  pemula: {
    current: "pemula",
    next: "menengah",
    weeksRequired: 12, // ±3 bulan
    criteria: [
      "12 minggu latihan konsisten (minimal 2 sesi per minggu)",
      "Kuasai teknik gerakan dasar: squat, hinge, push, pull",
      "Beban naik bertahap tiap 1-2 minggu (progressive overload masih linear)",
    ],
  },
  menengah: {
    current: "menengah",
    next: "mahir",
    weeksRequired: 48, // ±1 tahun di level menengah
    criteria: [
      "±1 tahun (48 minggu) latihan konsisten di level menengah",
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
