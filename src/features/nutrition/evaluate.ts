import { Goal } from "@/types/profile";

export type IntakeVerdict = {
  tone: "bad" | "warn" | "good";
  text: string;
};

// Kata kunci makanan/minuman yang menyabotase target — dipakai untuk teguran
// tegas di halaman Nutrisi (deteksi dari nama entri yang tercatat).
const UNHEALTHY_KEYWORDS = [
  "goreng",
  "es teh",
  "teh manis",
  "boba",
  "bubble tea",
  "soda",
  "cola",
  "sprite",
  "fanta",
  "sirup",
  "es krim",
  "donat",
  "martabak",
  "mie instan",
  "indomie",
  "mi instan",
  "keripik",
  "kerupuk",
  "wafer",
  "biskuit",
  "cokelat",
  "coklat",
  "kue",
  "es kopi susu",
  "gula aren",
  "seblak",
  "burger",
  "pizza",
  "fried chicken",
  "cireng",
  "cimol",
  "basreng",
  "gula",
];

const GOAL_CONSEQUENCE: Record<string, string> = {
  turun_lemak: "defisit kalorimu jebol dan lemak tidak akan turun",
  naik_massa: "kalorinya kosong gizi — massa otot butuh protein, bukan gula",
  toning: "definisi otot tertutup lemak kalau begini terus",
  strength: "recovery dan kekuatanmu dibangun dari gizi, bukan gula cair",
  kebugaran_umum: "kebugaranmu tidak akan naik dengan asupan begini",
  kesuburan: "gula berlebih mengganggu keseimbangan hormon yang sedang kamu jaga",
};

export function findUnhealthyFoods(foodNames: string[]): string[] {
  const hits: string[] = [];
  for (const name of foodNames) {
    const lower = name.toLowerCase();
    if (UNHEALTHY_KEYWORDS.some((k) => lower.includes(k)) && !hits.includes(name)) {
      hits.push(name);
    }
  }
  return hits;
}

/**
 * Evaluasi asupan hari ini secara TEGAS dan deterministik (tanpa AI):
 * bandingkan dengan target, tegur makanan tidak sehat, dan kaitkan dengan
 * latihan terakhir supaya dampaknya terasa nyata.
 */
export function evaluateIntake(input: {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  goal: Goal | string;
  foodNames: string[];
  lastSession: { label: string; volume: number } | null;
}): IntakeVerdict[] {
  const v: IntakeVerdict[] = [];
  const {
    calories,
    protein,
    calorieTarget,
    proteinTarget,
    fat,
    fatTarget,
    goal,
    foodNames,
    lastSession,
  } = input;

  if (foodNames.length === 0) {
    return [
      {
        tone: "warn",
        text: "Belum ada catatan makan hari ini. Otot tidak dibangun dari niat — catat makananmu supaya protein & kalorimu terkontrol.",
      },
    ];
  }

  // 1. Makanan/minuman tidak sehat — teguran paling keras, tampil paling atas.
  const unhealthy = findUnhealthyFoods(foodNames);
  if (unhealthy.length > 0) {
    const consequence =
      GOAL_CONSEQUENCE[goal] ?? "targetmu makin jauh kalau begini terus";
    const trainingImpact = lastSession
      ? ` Sesi ${lastSession.label} yang kamu selesaikan dengan susah payah bisa sia-sia hanya karena ini.`
      : "";
    v.push({
      tone: "bad",
      text: `Stop dulu: ${unhealthy.join(", ")} — ${consequence}.${trainingImpact} Ganti dengan air putih, buah, atau protein utuh.`,
    });
  }

  // 2. Kalori vs target.
  if (calorieTarget > 0) {
    const over = calories - calorieTarget;
    if (over > 0) {
      v.push({
        tone: "bad",
        text: `Kalori sudah ${Math.round(calories)} dari target ${calorieTarget} kkal (lebih ${Math.round(over)}). Cukup sampai di sini — sisanya air putih saja.`,
      });
    } else if (calories >= calorieTarget * 0.85) {
      v.push({
        tone: "warn",
        text: `Sisa jatah kalorimu tinggal ${Math.round(calorieTarget - calories)} kkal. Pilih yang tinggi protein & rendah minyak, jangan dihabiskan untuk camilan.`,
      });
    }
  }

  // 3. Protein vs target — inti dari semua tujuan latihan.
  if (proteinTarget > 0) {
    if (protein >= proteinTarget) {
      v.push({
        tone: "good",
        text: `Protein tercapai: ${Math.round(protein)}/${proteinTarget} g. Ini yang membangun ototmu — pertahankan.`,
      });
    } else if (calories >= calorieTarget * 0.85 && calorieTarget > 0) {
      v.push({
        tone: "bad",
        text: `Kalori hampir habis tapi protein baru ${Math.round(protein)}/${proteinTarget} g — porsimu kalah oleh karbo & lemak. Sisa makan hari ini WAJIB protein: telur, dada ayam, atau tempe.`,
      });
    } else if (protein < proteinTarget * 0.6) {
      v.push({
        tone: "warn",
        text: `Protein baru ${Math.round(protein)} dari ${proteinTarget} g. Kejar ${Math.round(proteinTarget - protein)} g lagi — tanpa protein cukup, latihanmu cuma bikin capek.`,
      });
    }
  }

  // 4. Lemak berlebih.
  if (fatTarget > 0 && fat > fatTarget) {
    v.push({
      tone: "warn",
      text: `Lemak sudah ${Math.round(fat)}/${fatTarget} g — biasanya dari gorengan & santan. Sisa makan hari ini yang direbus/panggang.`,
    });
  }

  // Semua aman → apresiasi singkat, tetap tegas.
  if (v.length === 0) {
    v.push({
      tone: "good",
      text: "Asupan hari ini disiplin: kalori terkendali dan tidak ada makanan sampah. Begini caranya menang.",
    });
  }

  return v.slice(0, 4);
}
