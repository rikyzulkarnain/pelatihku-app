"use client";

import { FOOD_EXAMPLES } from "@/constants/nutrition-constant";
import { GOAL_LABEL } from "@/constants/labels";
import { logFood, NutritionData } from "@/features/nutrition/action";
import { formatNumber } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function NutritionView({ data }: { data: NutritionData }) {
  const [proteinNow, setProteinNow] = useState(data.proteinNow);
  const [adding, setAdding] = useState<string | null>(null);

  const pct = data.proteinTarget
    ? Math.min(100, Math.round((proteinNow / data.proteinTarget) * 100))
    : 0;
  const circumference = 2 * Math.PI * 50;
  const kcalDash = `${circumference} ${circumference}`;

  async function add(food: (typeof FOOD_EXAMPLES)[number]) {
    setAdding(food.name);
    const res = await logFood({
      food_name: food.name,
      protein_g: food.protein_g,
      calories: food.calories,
    });
    setAdding(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setProteinNow((p) => p + food.protein_g);
    toast.success(`+${food.protein_g}g protein dari ${food.name}`);
  }

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--acc)" }}>
          Nutrisi
        </div>
        <h1 style={{ font: "900 26px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "6px 0 0" }}>
          Target harianmu
        </h1>
      </div>

      {/* calorie ring */}
      <div
        style={{
          borderRadius: 24,
          padding: 22,
          background: "var(--surface)",
          border: "1px solid var(--line2)",
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div style={{ position: "relative", width: 118, height: 118, flex: "none" }}>
          <svg width="118" height="118" viewBox="0 0 118 118" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="59" cy="59" r="50" fill="none" stroke="var(--raised)" strokeWidth="13" />
            <circle
              cx="59"
              cy="59"
              r="50"
              fill="none"
              style={{ stroke: "var(--acc)" }}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={kcalDash}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ font: "900 26px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
              {formatNumber(data.calorieTarget)}
            </span>
            <span style={{ font: "600 11px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
              kkal/hari
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "600 13px var(--font-jakarta), sans-serif", color: "var(--dim)", marginBottom: 4 }}>
            Estimasi dari profil & tujuan
          </div>
          <div style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)", lineHeight: 1.5 }}>
            {GOAL_LABEL[data.goal] ?? data.goal}
          </div>
          {data.bmi && (
            <div style={{ font: "600 12.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 6 }}>
              BMI kamu {data.bmi} · {data.bmiCategory}
            </div>
          )}
        </div>
      </div>

      {/* macros */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
        <Macro value={`${data.proteinTarget}g`} label="Protein" color="var(--acc)" />
        <Macro value={`${data.carbTarget}g`} label="Karbo" color="#7cc4ff" />
        <Macro value={`${data.fatTarget}g`} label="Lemak" color="#ff9a5c" />
      </div>

      {/* protein progress today */}
      <div style={{ marginTop: 18, borderRadius: 18, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Protein hari ini
          </span>
          <span style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
            {proteinNow} / {data.proteinTarget} g
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 10, background: "var(--track)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 10,
              background: "linear-gradient(90deg,#9fe119,#C9FB3C)",
              transition: "width .4s ease",
            }}
          />
        </div>
      </div>

      {/* protein sources */}
      <div style={{ marginTop: 20, font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 10 }}>
        Protein murah & lokal — ketuk untuk catat
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FOOD_EXAMPLES.map((food) => (
          <button
            key={food.name}
            onClick={() => add(food)}
            disabled={adding === food.name}
            style={{
              textAlign: "left",
              borderRadius: 16,
              padding: 14,
              background: "var(--surface)",
              border: "1px solid var(--line2)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: adding === food.name ? 0.6 : 1,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ font: "700 15px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                {food.name}
              </div>
              <div style={{ font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                {food.portion} · {food.calories} kkal
              </div>
            </div>
            <span style={{ font: "800 16px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
              {food.protein_g}g
            </span>
            <span style={{ fontSize: 22, color: "var(--acc)", lineHeight: 1 }}>+</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18, borderRadius: 14, padding: "14px 16px", background: "rgba(201,251,60,.06)", border: "1px dashed rgba(201,251,60,.2)", font: "500 12.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
        Hasil 70–80% ditentukan total kalori, protein, & tidur — bukan suplemen. Susu/whey
        hanya pelengkap. Angka ini estimasi, bukan nasihat medis.
      </div>
    </div>
  );
}

function Macro({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ borderRadius: 16, padding: 14, background: "var(--surface)", border: "1px solid var(--line2)", textAlign: "center" }}>
      <div style={{ font: "900 22px var(--font-archivo), sans-serif", color }}>{value}</div>
      <div style={{ font: "600 11px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
