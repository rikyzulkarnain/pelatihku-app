import { ExperienceLevel } from "@/types/profile";

export type LevelTarget = {
  current: ExperienceLevel;
  next: ExperienceLevel | null;
  /** Total sesi selesai yang dibutuhkan untuk naik level (akumulasi). */
  sessionsRequired: number;
  /** Kriteria kualitatif yang harus dipenuhi, untuk ditampilkan sebagai poin. */
  criteria: string[];
};

// Ambang deterministik & transparan: level naik seiring jam terbang.
// ~3 bulan konsisten (3x/minggu) untuk menengah, ~1 tahun untuk mahir.
const TARGETS: Record<ExperienceLevel, LevelTarget> = {
  pemula: {
    current: "pemula",
    next: "menengah",
    sessionsRequired: 36,
    criteria: [
      "Selesaikan 36 sesi latihan (≈3 bulan konsisten)",
      "Rutin sesuai jadwal programmu tiap minggu, tanpa bolong panjang",
      "Kuasai teknik gerakan dasar: squat, hinge, push, pull",
    ],
  },
  menengah: {
    current: "menengah",
    next: "mahir",
    sessionsRequired: 150,
    criteria: [
      "Selesaikan 150 sesi latihan total (≈1 tahun konsisten)",
      "Progressive overload rutin — beban/repetisi naik bertahap",
      "Mampu mengatur volume, intensitas, dan recovery sendiri",
    ],
  },
  mahir: {
    current: "mahir",
    next: null,
    sessionsRequired: 0,
    criteria: [
      "Pertahankan konsistensi — level tertinggi dinilai dari kualitas, bukan angka",
      "Jaga teknik tetap bersih saat beban makin berat",
      "Bantu tubuhmu: tidur cukup, protein terpenuhi, deload berkala",
    ],
  },
};

export function nextLevelTarget(
  level: ExperienceLevel | null,
): LevelTarget {
  return TARGETS[level ?? "pemula"];
}
