import {
  Equipment,
  ExperienceLevel,
  Gender,
  Goal,
} from "@/types/profile";
import {
  Exercise,
  EquipmentType,
  GeneratedDay,
  GeneratedProgram,
  MovementPattern,
  SplitType,
} from "@/types/program";

type GeneratorInput = {
  goal: Goal;
  gender: Gender;
  experience_level: ExperienceLevel;
  training_frequency: number;
  equipment: Equipment;
  injuries: string[];
};

const GOAL_PARAMS: Record<
  Goal,
  { rep_low: number; rep_high: number; set_low: number; set_high: number; cardio: boolean }
> = {
  turun_lemak: { rep_low: 8, rep_high: 15, set_low: 3, set_high: 4, cardio: true },
  naik_massa: { rep_low: 6, rep_high: 12, set_low: 3, set_high: 5, cardio: false },
  toning: { rep_low: 10, rep_high: 15, set_low: 3, set_high: 3, cardio: false },
  strength: { rep_low: 3, rep_high: 6, set_low: 4, set_high: 6, cardio: false },
  kebugaran_umum: { rep_low: 10, rep_high: 12, set_low: 2, set_high: 3, cardio: false },
  // Kesuburan: volume moderat (hindari overtraining yang menekan hormon),
  // rentang rep menengah + kardio ringan-sedang untuk sirkulasi & berat sehat.
  kesuburan: { rep_low: 8, rep_high: 12, set_low: 2, set_high: 3, cardio: true },
};

const GOAL_LABEL: Record<Goal, string> = {
  turun_lemak: "Turun Lemak",
  naik_massa: "Naik Massa",
  toning: "Toning",
  strength: "Strength",
  kebugaran_umum: "Kebugaran Umum",
  kesuburan: "Persiapan Kehamilan",
};

const SPLIT_LABEL: Record<SplitType, string> = {
  full_body: "Full Body",
  upper_lower: "Upper / Lower",
  ppl: "Push / Pull / Legs",
};

const TEMPLATES: Record<string, MovementPattern[]> = {
  "Full Body A": ["squat", "push_horizontal", "pull_horizontal", "core"],
  "Full Body B": ["hinge", "push_vertical", "pull_vertical", "core"],
  "Full Body C": ["squat", "push_horizontal", "pull_vertical", "isolation_legs", "core"],
  Upper: [
    "push_horizontal",
    "pull_horizontal",
    "push_vertical",
    "pull_vertical",
    "isolation_biceps",
    "isolation_triceps",
  ],
  Lower: ["squat", "hinge", "isolation_legs", "calf", "core"],
  Push: ["push_horizontal", "push_vertical", "isolation_chest", "isolation_triceps"],
  Pull: ["pull_vertical", "pull_horizontal", "isolation_back", "isolation_biceps"],
  Legs: ["squat", "hinge", "isolation_legs", "calf", "core"],
  // Fertility (pria): compound besar mendukung testosteron + kardio ringan.
  "Kesuburan Pria Bawah": ["squat", "hinge", "isolation_legs", "core", "cardio"],
  "Kesuburan Pria Atas": ["push_horizontal", "pull_horizontal", "push_vertical", "pull_vertical", "core"],
  "Kesuburan Pria Full": ["squat", "push_horizontal", "pull_vertical", "hinge", "core", "cardio"],
  // Fertility (wanita): kekuatan menyeluruh + core/pelvic & mobilitas, kardio low-impact.
  "Kesuburan Wanita A": ["squat", "hinge", "push_horizontal", "core", "core"],
  "Kesuburan Wanita B": ["pull_horizontal", "push_vertical", "isolation_back", "core", "cardio"],
  "Kesuburan Wanita C": ["hinge", "isolation_legs", "push_horizontal", "core", "cardio"],
};

type DaySpec = { label: string; focus: string; templateKey: string };

function buildFertilityDaySpecs(
  gender: Gender,
  frequency: number,
): { split: SplitType; days: DaySpec[] } {
  const rotation: DaySpec[] =
    gender === "cewek"
      ? [
          { label: "Kekuatan & Core A", focus: "Tubuh bawah, dada & pelvic/core", templateKey: "Kesuburan Wanita A" },
          { label: "Tubuh Atas & Mobilitas", focus: "Punggung, bahu & core", templateKey: "Kesuburan Wanita B" },
          { label: "Glutes, Core & Kardio", focus: "Glutes, kaki & kardio ringan", templateKey: "Kesuburan Wanita C" },
        ]
      : [
          { label: "Kekuatan Bawah", focus: "Kaki, glutes & core", templateKey: "Kesuburan Pria Bawah" },
          { label: "Kekuatan Atas", focus: "Dada, punggung, bahu & core", templateKey: "Kesuburan Pria Atas" },
          { label: "Full Body & Kardio", focus: "Seluruh tubuh & kardio ringan", templateKey: "Kesuburan Pria Full" },
        ];

  const count = Math.min(Math.max(frequency, 1), 6);
  const days: DaySpec[] = Array.from({ length: count }, (_, i) => {
    const base = rotation[i % rotation.length];
    const cycle = Math.floor(i / rotation.length);
    return cycle === 0 ? base : { ...base, label: `${base.label} ${cycle + 1}` };
  });
  return { split: "full_body", days };
}

function buildDaySpecs(
  goal: Goal,
  gender: Gender,
  frequency: number,
): {
  split: SplitType;
  days: DaySpec[];
} {
  if (goal === "kesuburan") {
    return buildFertilityDaySpecs(gender, frequency);
  }
  if (frequency <= 3) {
    const letters = ["A", "B", "C"].slice(0, frequency);
    return {
      split: "full_body",
      days: letters.map((l) => ({
        label: `Full Body ${l}`,
        focus: "Seluruh tubuh",
        templateKey: `Full Body ${l}`,
      })),
    };
  }
  if (frequency === 4) {
    return {
      split: "upper_lower",
      days: [
        { label: "Upper A", focus: "Dada, punggung, bahu, lengan", templateKey: "Upper" },
        { label: "Lower A", focus: "Kaki & core", templateKey: "Lower" },
        { label: "Upper B", focus: "Dada, punggung, bahu, lengan", templateKey: "Upper" },
        { label: "Lower B", focus: "Kaki & core", templateKey: "Lower" },
      ],
    };
  }
  // 5-6 days -> PPL
  const base: DaySpec[] = [
    { label: "Push", focus: "Dada, bahu, trisep", templateKey: "Push" },
    { label: "Pull", focus: "Punggung, bisep", templateKey: "Pull" },
    { label: "Legs", focus: "Kaki & core", templateKey: "Legs" },
  ];
  if (frequency === 5) {
    return {
      split: "ppl",
      days: [
        ...base,
        { label: "Upper", focus: "Tubuh atas", templateKey: "Upper" },
        { label: "Lower", focus: "Kaki & core", templateKey: "Lower" },
      ],
    };
  }
  return { split: "ppl", days: [...base, ...base] };
}

function allowedEquipment(equipment: Equipment): Set<EquipmentType> {
  if (equipment === "gym_lengkap")
    return new Set(["barbell", "dumbbell", "machine", "bodyweight", "cardio"]);
  if (equipment === "dumbbell_saja")
    return new Set(["dumbbell", "bodyweight", "cardio"]);
  return new Set(["bodyweight", "cardio"]);
}

const EQUIPMENT_TIER: Record<EquipmentType, number> = {
  barbell: 3,
  dumbbell: 2,
  machine: 2,
  bodyweight: 1,
  cardio: 1,
};

function pickExercise(
  pattern: MovementPattern,
  pool: Exercise[],
  allowed: Set<EquipmentType>,
  injuries: string[],
  level: ExperienceLevel,
  used: Set<string>,
): Exercise | null {
  let candidates = pool.filter(
    (e) =>
      e.movement_pattern === pattern &&
      allowed.has(e.equipment) &&
      !used.has(e.slug) &&
      !e.injury_cautions.some((c) => injuries.includes(c)),
  );

  if (candidates.length === 0) return null;

  // Beginners prefer pemula-level movements; fall back if none.
  if (level === "pemula") {
    const beginnerFriendly = candidates.filter((e) => e.level === "pemula");
    if (beginnerFriendly.length > 0) candidates = beginnerFriendly;
  }

  candidates.sort((a, b) => {
    const tier = EQUIPMENT_TIER[b.equipment] - EQUIPMENT_TIER[a.equipment];
    if (tier !== 0) return tier;
    return a.slug.localeCompare(b.slug);
  });

  return candidates[0];
}

export function generateProgram(
  input: GeneratorInput,
  exercises: Exercise[],
): GeneratedProgram {
  const params = GOAL_PARAMS[input.goal];
  const { split, days: daySpecs } = buildDaySpecs(
    input.goal,
    input.gender,
    input.training_frequency,
  );
  const allowed = allowedEquipment(input.equipment);
  const isBeginner = input.experience_level === "pemula";

  const targetSets = isBeginner
    ? params.set_low
    : Math.round((params.set_low + params.set_high) / 2);
  const maxPerDay = isBeginner ? 4 : 6;

  const cardio = exercises.find((e) => e.movement_pattern === "cardio") ?? null;

  const days: GeneratedDay[] = daySpecs.map((spec, dayIdx) => {
    const patterns = TEMPLATES[spec.templateKey] ?? [];
    const used = new Set<string>();
    const generated = [];
    let order = 0;

    for (const pattern of patterns) {
      if (generated.length >= maxPerDay) break;
      const ex = pickExercise(
        pattern,
        exercises,
        allowed,
        input.injuries,
        input.experience_level,
        used,
      );
      if (!ex) continue;
      used.add(ex.slug);
      generated.push({
        exercise_id: ex.id,
        slug: ex.slug,
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        order_index: order++,
        target_sets: targetSets,
        target_rep_low: params.rep_low,
        target_rep_high: params.rep_high,
        rest_seconds: isBeginner ? 120 : 90,
        notes:
          isBeginner && ex.is_compound ? "Fokus teknik & rentang gerak penuh" : null,
      });
    }

    // Cardio finisher for fat-loss goal.
    if (params.cardio && cardio && allowed.has(cardio.equipment)) {
      generated.push({
        exercise_id: cardio.id,
        slug: cardio.slug,
        name: cardio.name,
        muscle_group: cardio.muscle_group,
        equipment: cardio.equipment,
        order_index: order++,
        target_sets: 1,
        target_rep_low: 10,
        target_rep_high: 15,
        rest_seconds: 60,
        notes: "Penutup: kardio intensitas sedang (menit)",
      });
    }

    return {
      day_index: dayIdx + 1,
      label: spec.label,
      focus: spec.focus,
      exercises: generated,
    };
  });

  return {
    name: `${SPLIT_LABEL[split]} — ${GOAL_LABEL[input.goal]}`,
    split_type: split,
    goal: input.goal,
    frequency_per_week: input.training_frequency,
    rep_low: params.rep_low,
    rep_high: params.rep_high,
    set_low: params.set_low,
    set_high: params.set_high,
    includes_cardio: params.cardio,
    days,
    generated_meta: {
      goal: input.goal,
      level: input.experience_level,
      equipment: input.equipment,
      frequency: input.training_frequency,
      injuries: input.injuries,
    },
  };
}
