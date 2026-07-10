// Gerakan isometrik/hold — ditarget DETIK, bukan repetisi (praktik pelatih:
// "Plank 3 × 60 detik", bukan "Plank 8-15 rep"). Dipakai generator (menyetel
// target detik) dan UI sesi (menampilkan satuan "dtk").
export const HOLD_EXERCISE_SLUGS = new Set<string>([
  "plank",
  "side-plank",
  "copenhagen-side-plank",
  "bear-crawl-hold",
  "suitcase-hold",
  "hollow-body-hold",
  "l-sit",
  "wall-sit",
  "deep-squat-hold",
  "farmer-carry",
]);

export function isHoldExercise(slug: string): boolean {
  return HOLD_EXERCISE_SLUGS.has(slug);
}
