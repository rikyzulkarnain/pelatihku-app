import { isHoldExercise } from "@/constants/hold-exercises";
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
  GeneratedExercise,
  GeneratedProgram,
  MovementPattern,
  SplitType,
} from "@/types/program";

type GeneratorInput = {
  goal: Goal;
  gender: Gender;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  experience_level: ExperienceLevel;
  training_frequency: number;
  equipment: Equipment;
  injuries: string[];
  target_deadline: string | null;
};

// ── Parameter latihan per goal (NSCA/ACSM) ──────────────────────
// rep/set range per goal; rest dibedakan compound vs isolation karena
// compound butuh pemulihan lebih lama; cardio_minutes = durasi finisher.
type GoalParams = {
  rep_low: number;
  rep_high: number;
  set_low: number;
  set_high: number;
  cardio: boolean;
  rest_compound: number;
  rest_isolation: number;
  cardio_minutes: [number, number];
  // Intensitas beban target = variabel penentu utama (NSCA/ACSM). Tanpa ini
  // rentang rep tidak bermakna. %1RM untuk gerakan berbeban; RIR (reps-in-
  // reserve) berlaku semua gerakan resistance sbg proksimitas ke kegagalan.
  intensity_low: number;
  intensity_high: number;
  rir_low: number;
  rir_high: number;
};

const GOAL_PARAMS: Record<Goal, GoalParams> = {
  // Fat loss: rep menengah-tinggi, istirahat pendek (densitas), kardio wajib.
  turun_lemak: {
    rep_low: 8, rep_high: 15, set_low: 3, set_high: 4, cardio: true,
    rest_compound: 90, rest_isolation: 60, cardio_minutes: [15, 20],
    intensity_low: 60, intensity_high: 75, rir_low: 1, rir_high: 2,
  },
  // Hypertrophy: 6-12 rep, volume tinggi, istirahat >=90s isolation / 120s
  // compound (Schoenfeld 2016: rest >=2mnt unggul untuk hipertrofi).
  naik_massa: {
    rep_low: 6, rep_high: 12, set_low: 3, set_high: 5, cardio: false,
    rest_compound: 120, rest_isolation: 90, cardio_minutes: [10, 15],
    intensity_low: 67, intensity_high: 80, rir_low: 1, rir_high: 2,
  },
  // Toning: rep tinggi beban sedang + kardio ringan untuk definisi.
  toning: {
    rep_low: 10, rep_high: 15, set_low: 3, set_high: 4, cardio: true,
    rest_compound: 75, rest_isolation: 60, cardio_minutes: [10, 15],
    intensity_low: 55, intensity_high: 70, rir_low: 1, rir_high: 3,
  },
  // Strength: rep rendah beban berat (>=85% 1RM), pemulihan neural penuh
  // (compound 180s, isolasi 120s). Aksesori di-override ke 70-80% di bawah.
  strength: {
    rep_low: 3, rep_high: 6, set_low: 4, set_high: 6, cardio: false,
    rest_compound: 180, rest_isolation: 120, cardio_minutes: [10, 15],
    intensity_low: 85, intensity_high: 92, rir_low: 1, rir_high: 3,
  },
  // Kebugaran umum: volume moderat + kardio (ACSM: 150 menit/minggu).
  kebugaran_umum: {
    rep_low: 10, rep_high: 12, set_low: 2, set_high: 3, cardio: true,
    rest_compound: 90, rest_isolation: 60, cardio_minutes: [15, 20],
    intensity_low: 60, intensity_high: 70, rir_low: 2, rir_high: 3,
  },
  // Kesuburan: volume moderat (hindari overtraining yang menekan hormon),
  // beban ringan-sedang & JAUH dari kegagalan (RIR >=2, tanpa Valsalva).
  kesuburan: {
    rep_low: 8, rep_high: 12, set_low: 2, set_high: 3, cardio: true,
    rest_compound: 90, rest_isolation: 60, cardio_minutes: [20, 30],
    intensity_low: 50, intensity_high: 65, rir_low: 2, rir_high: 3,
  },
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
  // Fat loss / kebugaran: hari kondisi — core + kardio panjang (finisher di-boost).
  "Kondisi & Core": ["core", "core", "isolation_legs"],
  // Strength: hari kekuatan murni — compound besar tanpa isolasi lengan.
  "Kekuatan Atas": ["push_horizontal", "pull_horizontal", "push_vertical", "pull_vertical", "core"],
  "Kekuatan Bawah": ["squat", "hinge", "isolation_legs", "core"],
  // Fertility (pria): compound besar mendukung testosteron + kardio ringan.
  "Kesuburan Pria Bawah": ["squat", "hinge", "isolation_legs", "core", "cardio"],
  "Kesuburan Pria Atas": ["push_horizontal", "pull_horizontal", "push_vertical", "pull_vertical", "core"],
  "Kesuburan Pria Full": ["squat", "push_horizontal", "pull_vertical", "hinge", "core", "cardio"],
  // Fertility (wanita): kekuatan menyeluruh + core/pelvic & mobilitas, kardio low-impact.
  "Kesuburan Wanita A": ["squat", "hinge", "push_horizontal", "core", "core"],
  "Kesuburan Wanita B": ["pull_horizontal", "push_vertical", "isolation_back", "core", "cardio"],
  "Kesuburan Wanita C": ["hinge", "isolation_legs", "push_horizontal", "core", "cardio"],
};

type DaySpec = {
  label: string;
  focus: string;
  templateKey: string;
  /** Hari kondisi: durasi kardio finisher ditambah (fat loss/kebugaran/toning). */
  cardioBoost?: boolean;
};

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

// ── Struktur hari per TUJUAN — mengikuti praktik penyusunan program pelatih:
// fat loss/kebugaran → full body frekuensi tinggi + hari kondisi (kardio+core);
// hipertrofi → volume split (FB → PPL/UL); strength → hari kekuatan compound
// dengan pemulihan penuh; toning → campuran UL + hari kondisi; kesuburan →
// desain khusus gender (lihat buildFertilityDaySpecs).
function buildDaySpecs(
  goal: Goal,
  gender: Gender,
  frequency: number,
  level: ExperienceLevel,
): {
  split: SplitType;
  days: DaySpec[];
} {
  if (goal === "kesuburan") {
    return buildFertilityDaySpecs(gender, frequency);
  }

  const freq = Math.min(Math.max(frequency, 1), 6);
  const fullBody = (letter: "A" | "B" | "C"): DaySpec => ({
    label: `Full Body ${letter}`,
    focus: "Seluruh tubuh",
    templateKey: `Full Body ${letter}`,
  });
  const kondisi = (suffix = ""): DaySpec => ({
    label: `Kondisi & Core${suffix}`,
    focus: "Kardio, core & daya tahan",
    templateKey: "Kondisi & Core",
    cardioBoost: true,
  });
  const upper = (s: string): DaySpec => ({
    label: `Upper ${s}`,
    focus: "Dada, punggung, bahu, lengan",
    templateKey: "Upper",
  });
  const lower = (s: string): DaySpec => ({
    label: `Lower ${s}`,
    focus: "Kaki & core",
    templateKey: "Lower",
  });
  const fbLetters = (n: number) =>
    (["A", "B", "C"] as const).slice(0, Math.min(n, 3)).map(fullBody);

  // ── Turun lemak & kebugaran umum: full body (frekuensi per otot tinggi,
  // kalori terbakar besar) + hari kondisi khusus mulai 4x/minggu.
  if (goal === "turun_lemak" || goal === "kebugaran_umum") {
    if (freq <= 3) return { split: "full_body", days: fbLetters(freq) };
    if (freq === 4)
      return {
        split: "full_body",
        days: [fullBody("A"), fullBody("B"), kondisi(), fullBody("C")],
      };
    if (freq === 5)
      return {
        split: "full_body",
        days: [fullBody("A"), fullBody("B"), kondisi(), fullBody("C"), kondisi(" 2")],
      };
    return {
      split: "upper_lower",
      days: [upper("A"), lower("A"), kondisi(), upper("B"), lower("B"), kondisi(" 2")],
    };
  }

  // ── Strength: hari kekuatan murni — compound besar, tanpa isolasi lengan,
  // istirahat panjang. 5-6x menambah hari teknik/aksesori, bukan volume berat.
  if (goal === "strength") {
    if (freq <= 3)
      return {
        split: "full_body",
        days: ["A", "B", "C"].slice(0, freq).map((l, i) => ({
          label: `Kekuatan Full ${l}`,
          focus: "Compound berat seluruh tubuh",
          templateKey: `Full Body ${["A", "B", "C"][i]}`,
        })),
      };
    const strengthFour: DaySpec[] = [
      { label: "Kekuatan Bawah A", focus: "Squat, hinge & core", templateKey: "Kekuatan Bawah" },
      { label: "Kekuatan Atas A", focus: "Press & tarikan berat", templateKey: "Kekuatan Atas" },
      { label: "Kekuatan Bawah B", focus: "Squat, hinge & core", templateKey: "Kekuatan Bawah" },
      { label: "Kekuatan Atas B", focus: "Press & tarikan berat", templateKey: "Kekuatan Atas" },
    ];
    if (freq === 4) return { split: "upper_lower", days: strengthFour };
    const teknik: DaySpec = {
      label: "Teknik & Aksesori",
      focus: "Perbaiki teknik & titik lemah",
      templateKey: "Full Body C",
    };
    if (freq === 5) return { split: "upper_lower", days: [...strengthFour, teknik] };
    return {
      split: "upper_lower",
      days: [
        ...strengthFour,
        teknik,
        { label: "Kekuatan Full", focus: "Compound berat seluruh tubuh", templateKey: "Full Body A" },
      ],
    };
  }

  // ── Toning: full body di frekuensi rendah, Upper/Lower + hari kondisi di
  // frekuensi tinggi (definisi butuh kardio, bukan volume beban maksimal).
  if (goal === "toning") {
    if (freq <= 3) return { split: "full_body", days: fbLetters(freq) };
    if (freq === 4)
      return { split: "upper_lower", days: [upper("A"), lower("A"), upper("B"), lower("B")] };
    if (freq === 5)
      return {
        split: "upper_lower",
        days: [upper("A"), lower("A"), kondisi(), upper("B"), lower("B")],
      };
    return {
      split: "upper_lower",
      days: [upper("A"), lower("A"), kondisi(), upper("B"), lower("B"), kondisi(" 2")],
    };
  }

  // ── Naik massa (hipertrofi): progresi split klasik sesuai frekuensi & level.
  if (freq <= 2) return { split: "full_body", days: fbLetters(freq) };
  if (freq === 3) {
    // 3x/minggu: Full Body untuk SEMUA level — PPL 1x rotasi hanya melatih
    // tiap otot 1x/minggu, di bawah standar frekuensi >=2x/otot/minggu
    // (Schoenfeld; RP volume landmarks). PPL baru layak mulai 5-6 hari.
    return { split: "full_body", days: fbLetters(3) };
  }
  const upperLower: DaySpec[] = [upper("A"), lower("A"), upper("B"), lower("B")];
  if (freq === 4) {
    return { split: "upper_lower", days: upperLower };
  }
  // Pemula 5-6 hari: tetap Upper/Lower (recovery lebih aman daripada PPL,
  // sesuai rekomendasi trainer untuk frekuensi tinggi tanpa pengalaman).
  if (level === "pemula") {
    return {
      split: "upper_lower",
      days:
        freq === 5
          ? [
              ...upperLower,
              { label: "Full Body", focus: "Seluruh tubuh", templateKey: "Full Body A" },
            ]
          : [...upperLower, upper("C"), lower("C")],
    };
  }
  // 5-6 days -> PPL
  const base: DaySpec[] = [
    { label: "Push", focus: "Dada, bahu, trisep", templateKey: "Push" },
    { label: "Pull", focus: "Punggung, bisep", templateKey: "Pull" },
    { label: "Legs", focus: "Kaki & core", templateKey: "Legs" },
  ];
  if (freq === 5) {
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

export function allowedEquipment(equipment: Equipment): Set<EquipmentType> {
  // Equipment "cardio" = mesin kardio (rowing/sepeda statis/elliptical),
  // hanya tersedia di gym lengkap.
  if (equipment === "gym_lengkap")
    return new Set(["barbell", "dumbbell", "machine", "bodyweight", "cardio"]);
  if (equipment === "dumbbell_saja") return new Set(["dumbbell", "bodyweight"]);
  return new Set(["bodyweight"]);
}

const EQUIPMENT_TIER: Record<EquipmentType, number> = {
  barbell: 3,
  dumbbell: 2,
  machine: 2,
  bodyweight: 1,
  cardio: 1,
};

const LEVEL_ORDER: Record<ExperienceLevel, number> = {
  pemula: 1,
  menengah: 2,
  mahir: 3,
};

// Gerakan high-impact (lompatan) — dihindari untuk BMI tinggi, usia 55+,
// keluhan lutut/pergelangan kaki, dan goal kesuburan.
export function isHighImpact(e: Exercise): boolean {
  return (
    e.slug.includes("jump") ||
    e.slug.includes("burpee") ||
    e.slug.includes("hop") ||
    e.slug.includes("plyo") ||
    e.slug.includes("climber") ||
    e.slug.includes("high-knees") ||
    e.slug.includes("sprint")
  );
}

// Gerakan yang dihindari untuk goal kesuburan/persiapan kehamilan (ACOG):
// (1) fleksi + rotasi tulang belakang → risiko diastasis recti; (2) risiko
// jatuh / keseimbangan tinggi tanpa tumpuan. Beban mendekati kegagalan &
// Valsalva sudah dijaga lewat RIR >=2 (lihat GOAL_PARAMS.kesuburan).
const PREGNANCY_UNSAFE_SLUGS = new Set<string>([
  // Fleksi/rotasi batang tubuh & tekanan intra-abdominal tinggi
  "russian-twist", "bicycle-crunch", "v-up", "crunch", "hollow-body-hold",
  "hanging-knee-raise", "hanging-leg-raise", "dragon-flag", "l-sit",
  "ab-wheel-rollout", "sit-up", "cable-woodchop",
  // Risiko jatuh / keseimbangan tinggi
  "pistol-squat", "single-leg-rdl", "bulgarian-split-squat", "overhead-squat",
  "turkish-get-up", "muscle-up", "handstand-push-up", "sissy-squat",
]);

export function isPregnancyUnsafe(e: Exercise): boolean {
  return PREGNANCY_UNSAFE_SLUGS.has(e.slug);
}

type PickContext = {
  allowed: Set<EquipmentType>;
  injuries: string[];
  level: ExperienceLevel;
  lowImpact: boolean;
  /** Goal kesuburan: buang gerakan fleksi/rotasi tulang belakang & risiko jatuh. */
  avoidPregnancyRisk: boolean;
  preferSlugs: string[];
  /** Seed rotasi: tie-break kandidat digilir per generasi program, bukan
   *  selalu alfabetis — agar seluruh bank latihan kebagian dipakai
   *  (tanpa seed, slug awal alfabet spt "bear-crawl-hold" selalu menang
   *  dan gerakan seperti "plank" tidak pernah muncul). */
  seed: number;
};

// Hash deterministik kecil untuk rotasi kandidat (djb2).
function slugHash(slug: string, seed: number): number {
  let h = 5381 + seed;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function pickExercise(
  pattern: MovementPattern,
  pool: Exercise[],
  ctx: PickContext,
  used: Set<string>,
  weekAvoid: Set<string> = new Set(),
): Exercise | null {
  let candidates = pool.filter(
    (e) =>
      e.movement_pattern === pattern &&
      ctx.allowed.has(e.equipment) &&
      !used.has(e.slug) &&
      !e.injury_cautions.some((c) => ctx.injuries.includes(c)) &&
      !(ctx.lowImpact && isHighImpact(e)) &&
      !(ctx.avoidPregnancyRisk && isPregnancyUnsafe(e)),
  );

  if (candidates.length === 0) return null;

  // Utamakan gerakan yang sesuai/di bawah level user (pemula tidak diberi
  // gerakan mahir); fallback ke semua kandidat kalau tidak ada.
  const atOrBelow = candidates.filter(
    (e) => LEVEL_ORDER[e.level] <= LEVEL_ORDER[ctx.level],
  );
  if (atOrBelow.length > 0) candidates = atOrBelow;

  // Pemula: prioritaskan gerakan level pemula dulu (belajar pola dasar).
  if (ctx.level === "pemula") {
    const beginnerFriendly = candidates.filter((e) => e.level === "pemula");
    if (beginnerFriendly.length > 0) candidates = beginnerFriendly;
  }

  // Rotasi antar-hari SETELAH filter level: variasikan gerakan yang belum
  // dipakai minggu ini, tapi lebih baik mengulang gerakan yang pas levelnya
  // daripada naik ke gerakan yang lebih sulit.
  const notYetThisWeek = candidates.filter((e) => !weekAvoid.has(e.slug));
  if (notYetThisWeek.length > 0) candidates = notYetThisWeek;

  candidates.sort((a, b) => {
    // Gerakan prioritas goal (mis. pelvic floor untuk kesuburan) menang dulu.
    const prefA = ctx.preferSlugs.indexOf(a.slug);
    const prefB = ctx.preferSlugs.indexOf(b.slug);
    if (prefA !== prefB) {
      return (prefA === -1 ? 99 : prefA) - (prefB === -1 ? 99 : prefB);
    }
    // Level terdekat dengan user menang (menengah dapat gerakan menengah,
    // bukan versi assisted pemula; fallback ke atas pilih yang paling ringan).
    const closeA = Math.abs(LEVEL_ORDER[a.level] - LEVEL_ORDER[ctx.level]);
    const closeB = Math.abs(LEVEL_ORDER[b.level] - LEVEL_ORDER[ctx.level]);
    if (closeA !== closeB) return closeA - closeB;
    const tier = EQUIPMENT_TIER[b.equipment] - EQUIPMENT_TIER[a.equipment];
    if (tier !== 0) return tier;
    // Tie-break digilir per program (bukan alfabetis permanen) supaya semua
    // variasi di bank latihan kebagian giliran antar-regenerasi.
    return slugHash(a.slug, ctx.seed) - slugHash(b.slug, ctx.seed);
  });

  // Jangan paksakan gerakan 2 level di atas kemampuan (mis. pemula tidak
  // pernah diberi gerakan mahir) — lebih baik slot dikosongkan.
  const best = candidates[0];
  if (LEVEL_ORDER[best.level] - LEVEL_ORDER[ctx.level] >= 2) return null;
  return best;
}

function computeBMI(
  weight_kg: number | null,
  height_cm: number | null,
): number | null {
  if (!weight_kg || !height_cm) return null;
  const h = height_cm / 100;
  return Math.round((weight_kg / (h * h)) * 10) / 10;
}

export function generateProgram(
  input: GeneratorInput,
  exercises: Exercise[],
  /** Seed rotasi variasi; default berubah tiap generasi agar bank latihan tergilir. */
  seed: number = Math.floor(Date.now() / 86_400_000),
): GeneratedProgram {
  const params = GOAL_PARAMS[input.goal];
  const level = input.experience_level;
  const isBeginner = level === "pemula";

  const bmi = computeBMI(input.weight_kg, input.height_cm);
  const age = input.age;
  const isSenior = age !== null && age >= 55;
  const isYouth = age !== null && age < 18;
  // Low-impact: lindungi sendi (BMI ≥ 30 / usia 55+ / keluhan kaki) dan
  // hindari intensitas kejut untuk persiapan kehamilan.
  const lowImpact =
    (bmi !== null && bmi >= 30) ||
    isSenior ||
    input.goal === "kesuburan" ||
    input.injuries.includes("lutut") ||
    input.injuries.includes("pergelangan_kaki");

  const { split, days: daySpecs } = buildDaySpecs(
    input.goal,
    input.gender,
    input.training_frequency,
    level,
  );
  const allowed = allowedEquipment(input.equipment);

  // Volume set per level; usia 55+ ditahan di volume moderat (recovery).
  let targetSets = isBeginner
    ? params.set_low
    : level === "mahir"
      ? params.set_high
      : Math.round((params.set_low + params.set_high) / 2);
  if (isSenior) {
    targetSets = Math.min(
      targetSets,
      Math.round((params.set_low + params.set_high) / 2),
    );
  }

  // Kesuburan longgar 1 slot: template-nya memuat 2 gerakan core ringan
  // (pelvic floor + napas/stabilitas) yang keduanya harus masuk.
  const maxPerDay = isBeginner
    ? input.goal === "kesuburan"
      ? 5
      : 4
    : level === "mahir" && !isSenior
      ? 6
      : 5;

  // Istirahat ekstra untuk pemula (belajar teknik) & usia 55+ (recovery).
  const restBonus = (isBeginner ? 30 : 0) + (isSenior ? 30 : 0);

  // Glute emphasis untuk cewek dengan goal bentuk tubuh: tambah pola hinge
  // (hip thrust/RDL) di hari kaki & full body.
  const gluteEmphasis =
    input.gender === "cewek" &&
    (input.goal === "toning" || input.goal === "turun_lemak");

  // Durasi kardio dinaikkan bila target waktu ketat (1-3 bulan).
  const deadlineBoost =
    input.target_deadline === "1m" ? 10 : input.target_deadline === "3m" ? 5 : 0;
  const cardioLow = params.cardio_minutes[0] + deadlineBoost;
  const cardioHigh = params.cardio_minutes[1] + deadlineBoost;

  const pickCtx: PickContext = {
    allowed,
    injuries: input.injuries,
    level,
    lowImpact,
    avoidPregnancyRisk: input.goal === "kesuburan",
    seed,
    // Persiapan kehamilan: otot dasar panggul, napas diafragma & stabilitas
    // core diutamakan — dirotasi antar-hari lewat weekAvoid di pickExercise.
    preferSlugs:
      input.goal === "kesuburan"
        ? [
            "pelvic-floor-kegel",
            "diaphragmatic-breathing",
            "bird-dog",
            "dead-bug",
            "glute-bridge-march",
            "cat-cow",
            "world-greatest-stretch",
          ]
        : [],
  };

  // Kandidat kardio yang aman untuk user ini (low-impact & cedera dihormati),
  // dirotasi antar-hari supaya tidak monoton (jalan cepat / sepeda / rowing).
  let cardioChoices = exercises
    .filter(
      (e) =>
        e.movement_pattern === "cardio" &&
        allowed.has(e.equipment) &&
        !(lowImpact && isHighImpact(e)) &&
        !e.injury_cautions.some((c) => input.injuries.includes(c)),
    )
    .sort((a, b) => a.slug.localeCompare(b.slug));
  // Pemula tidak diberi kardio level menengah/mahir (mis. burpee).
  const cardioAtLevel = cardioChoices.filter(
    (e) => LEVEL_ORDER[e.level] <= LEVEL_ORDER[level],
  );
  if (cardioAtLevel.length > 0) cardioChoices = cardioAtLevel;
  // Finisher bertarget MENIT harus steady-state (jalan cepat/mesin kardio/
  // lompat tali) — gerakan burst (high knees, burpee, jumping jack) tidak
  // masuk akal dilakukan 15-30 menit nonstop.
  const steadyState = cardioChoices.filter(
    (e) =>
      e.equipment === "cardio" ||
      ["brisk-walk", "jump-rope", "shadow-boxing"].includes(e.slug),
  );
  if (steadyState.length > 0) cardioChoices = steadyState;

  // Slug yang sudah dipakai di hari-hari sebelumnya minggu ini — dipakai
  // pickExercise agar tiap hari memakai variasi berbeda selama pool cukup.
  const weekUsed = new Set<string>();

  const days: GeneratedDay[] = daySpecs.map((spec, dayIdx) => {
    const patterns = [...(TEMPLATES[spec.templateKey] ?? [])];
    const isLegDay = /Lower|Legs|Full Body|Kondisi|Kekuatan Bawah/.test(spec.templateKey);
    if (gluteEmphasis && isLegDay && !patterns.includes("hinge")) {
      patterns.splice(Math.min(2, patterns.length), 0, "hinge");
    }

    const used = new Set<string>();
    const generated: GeneratedExercise[] = [];
    let order = 0;

    for (const pattern of patterns) {
      if (generated.length >= maxPerDay) break;
      // Kardio ditangani sebagai finisher berbasis menit di bawah, bukan
      // sebagai latihan ber-rep di tengah sesi.
      if (pattern === "cardio") continue;
      const ex = pickExercise(pattern, exercises, pickCtx, used, weekUsed);
      if (!ex) continue;
      used.add(ex.slug);
      weekUsed.add(ex.slug);

      // Isolation/core tetap rep menengah walau goal strength — beban
      // maksimal hanya untuk compound besar (praktik standar coaching).
      const isAccessory = !ex.is_compound || pattern === "core";
      let repLow = params.rep_low;
      let repHigh = params.rep_high;
      let intLow: number | null = params.intensity_low;
      let intHigh: number | null = params.intensity_high;
      if (input.goal === "strength" && isAccessory) {
        repLow = 8;
        repHigh = 12;
        // Aksesori tidak diberi beban maksimal — turun ke zona hipertrofi.
        intLow = 70;
        intHigh = 80;
      }
      // Remaja: hindari beban maksimal rep 3-5, geser ke 6-10 (panduan
      // youth strength training).
      if (isYouth && input.goal === "strength" && repLow < 6) {
        repLow = 6;
        repHigh = 10;
        intLow = 70;
        intHigh = 80;
      }
      // %1RM hanya bermakna untuk beban eksternal; bodyweight memakai RIR saja.
      const isWeighted =
        ex.equipment === "barbell" ||
        ex.equipment === "dumbbell" ||
        ex.equipment === "machine";
      if (!isWeighted) {
        intLow = null;
        intHigh = null;
      }

      // Gerakan isometrik (plank, wall-sit, dll) ditarget DETIK tahan, bukan
      // rep — "Plank 3×60 detik" adalah resep standar pelatih. Rentang naik
      // sesuai level (pemula 20-40s, lainnya 30-60s).
      const isHold = isHoldExercise(ex.slug);
      if (isHold) {
        repLow = isBeginner ? 20 : 30;
        repHigh = isBeginner ? 40 : 60;
        intLow = null;
        intHigh = null;
      }

      const notes: string[] = [];
      if (isHold) {
        notes.push("Tahan posisi sesuai target (detik), napas teratur");
      }
      if (order === 0) {
        notes.push("Awali pemanasan 5-10 menit (kardio ringan + gerak dinamis)");
      }
      if (isBeginner && ex.is_compound) {
        notes.push("Fokus teknik & rentang gerak penuh");
      }
      if (isSenior && ex.is_compound) {
        notes.push("Naikkan beban bertahap, prioritaskan kontrol");
      }

      generated.push({
        exercise_id: ex.id,
        slug: ex.slug,
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        order_index: order++,
        target_sets: isAccessory ? Math.min(targetSets, 3) : targetSets,
        target_rep_low: repLow,
        target_rep_high: repHigh,
        target_intensity_low: intLow,
        target_intensity_high: intHigh,
        // RIR tidak bermakna untuk hold berbasis detik.
        target_rir_low: isHold ? null : params.rir_low,
        target_rir_high: isHold ? null : params.rir_high,
        rest_seconds:
          (ex.is_compound ? params.rest_compound : params.rest_isolation) +
          restBonus,
        notes: notes.length > 0 ? notes.join(". ") : null,
      });
    }

    // Cardio finisher (fat loss / toning / kebugaran / kesuburan),
    // bergilir antar-hari dari kandidat yang aman.
    const cardio =
      cardioChoices.length > 0
        ? cardioChoices[dayIdx % cardioChoices.length]
        : null;
    if (params.cardio && cardio) {
      // Hari "Kondisi & Core": porsi kardio lebih panjang — inilah inti harinya.
      const boost = spec.cardioBoost ? 10 : 0;
      generated.push({
        exercise_id: cardio.id,
        slug: cardio.slug,
        name: cardio.name,
        muscle_group: cardio.muscle_group,
        equipment: cardio.equipment,
        order_index: order++,
        target_sets: 1,
        target_rep_low: cardioLow + boost,
        target_rep_high: cardioHigh + boost,
        target_intensity_low: null,
        target_intensity_high: null,
        target_rir_low: null,
        target_rir_high: null,
        rest_seconds: 60,
        notes: lowImpact
          ? "Penutup: kardio low-impact intensitas ringan-sedang (menit)"
          : "Penutup: kardio intensitas sedang (menit)",
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
      level,
      equipment: input.equipment,
      frequency: input.training_frequency,
      injuries: input.injuries,
      age,
      bmi,
      gender: input.gender,
      target_deadline: input.target_deadline,
      low_impact: lowImpact,
      glute_emphasis: gluteEmphasis,
    },
  };
}
