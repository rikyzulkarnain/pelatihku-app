import { EquipmentType } from "@/types/program";
import { OverloadSuggestion, SetLog } from "@/types/workout";

const INCREMENT: Record<EquipmentType, number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 2.5,
  bodyweight: 0,
  cardio: 0,
};

/**
 * Deterministic progressive-overload suggestion from the most recent logged sets
 * of an exercise. Pure function (no DB/AI).
 */
export function suggestNextSet(
  lastSets: SetLog[] | null,
  target: { rep_low: number; rep_high: number; sets: number },
  equipment: EquipmentType,
): OverloadSuggestion {
  const working = (lastSets ?? []).filter((s) => !s.is_warmup);

  if (working.length === 0) {
    return {
      weight_kg: 0,
      reps: target.rep_low,
      message: null,
    };
  }

  const topWeight = Math.max(...working.map((s) => s.weight_kg));
  const lastReps = working[working.length - 1]?.reps ?? target.rep_low;
  // Hanya naikkan beban kalau SEMUA set target sesi lalu selesai DAN semuanya
  // mencapai batas atas rep — bukan cuma satu set yang tercatat.
  const completedAllSets = working.length >= target.sets;
  const allHitTop =
    completedAllSets && working.every((s) => s.reps >= target.rep_high);
  const inc = INCREMENT[equipment];
  // Latihan tanpa beban: satuannya repetisi (bodyweight) atau menit (kardio),
  // jadi progresinya di reps/durasi — jangan bicara kg ke user.
  const unit = equipment === "cardio" ? "menit" : "repetisi";
  const weightless = equipment === "bodyweight" || equipment === "cardio";

  if (allHitTop) {
    if (weightless) {
      return {
        weight_kg: topWeight,
        reps: lastReps + 2,
        message: `Mantap! Sesi lalu penuh — coba +2 ${unit} jadi ${lastReps + 2}.`,
      };
    }
    const next = topWeight + inc;
    return {
      weight_kg: next,
      reps: target.rep_low,
      message: `Kamu kuat sesi lalu — naik ke ${next} kg.`,
    };
  }

  // Sesi lalu belum tuntas semua set → pertahankan beban dulu, jangan naik.
  if (!completedAllSets) {
    return {
      weight_kg: topWeight,
      reps: target.rep_high,
      message: weightless
        ? `Selesaikan semua ${target.sets} set dulu untuk bisa nambah ${unit}.`
        : `Tetap ${topWeight} kg dulu — selesaikan semua ${target.sets} set untuk bisa naik.`,
    };
  }

  const nextReps = Math.min(lastReps + 1, target.rep_high);
  return {
    weight_kg: topWeight,
    reps: nextReps,
    message: weightless
      ? `Coba ${nextReps} ${unit} sesi ini.`
      : `Ulangi ${topWeight} kg, target +1 repetisi.`,
  };
}
