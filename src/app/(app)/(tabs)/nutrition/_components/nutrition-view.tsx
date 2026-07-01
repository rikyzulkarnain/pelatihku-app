"use client";

import { FOOD_EXAMPLES } from "@/constants/nutrition-constant";
import { GOAL_LABEL } from "@/constants/labels";
import { logFood, NutritionData } from "@/features/nutrition/action";
import { formatNumber } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import NutritionChat from "./nutrition-chat";

type DayLog = {
  food_name: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  calories: number;
};

export default function NutritionView({ data }: { data: NutritionData }) {
  const [proteinNow, setProteinNow] = useState(data.proteinNow);
  const [adding, setAdding] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [logs, setLogs] = useState<DayLog[]>(() =>
    data.logs.map((l) => ({
      food_name: l.food_name,
      protein_g: Number(l.protein_g) || 0,
      carb_g: Number(l.carb_g) || 0,
      fat_g: Number(l.fat_g) || 0,
      calories: Number(l.calories) || 0,
    })),
  );

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
    setLogs((prev) => [
      { food_name: food.name, protein_g: food.protein_g, carb_g: 0, fat_g: 0, calories: food.calories },
      ...prev,
    ]);
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

      {/* catat via chat / suara */}
      <button
        onClick={() => setChatOpen(true)}
        style={{
          width: "100%",
          textAlign: "left",
          borderRadius: 18,
          padding: "14px 16px",
          marginBottom: 14,
          background: "linear-gradient(120deg,rgba(201,251,60,.14),rgba(201,251,60,.05))",
          border: "1px solid rgba(201,251,60,.28)",
          display: "flex",
          alignItems: "center",
          gap: 13,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            flex: "none",
            borderRadius: 13,
            background: "var(--lime)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#10130a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "800 14.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Catat makan pakai chat / suara
          </div>
          <div style={{ font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
            “Nasi, ayam 1 potong, bayam, tempe” — makro dihitung otomatis
          </div>
        </div>
        <span style={{ fontSize: 20, color: "var(--acc)" }}>›</span>
      </button>

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

      {/* today's food history */}
      <div style={{ marginTop: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)" }}>
          Sudah dimakan hari ini
        </span>
        {logs.length > 0 && (
          <span style={{ font: "700 12px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
            {logs.length} item
          </span>
        )}
      </div>
      {logs.length === 0 ? (
        <div style={{ borderRadius: 16, padding: "18px 16px", background: "var(--surface)", border: "1px dashed var(--line2)", textAlign: "center", font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
          Belum ada catatan. Ketuk “Catat makan pakai chat / suara” di atas, atau pilih dari daftar di bawah.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                borderRadius: 14,
                padding: "11px 14px",
                background: "var(--surface)",
                border: "1px solid var(--line2)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.food_name}
                </div>
                <div style={{ font: "500 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                  {Math.round(l.calories)} kkal · {formatNumber(l.carb_g)}g karbo · {formatNumber(l.fat_g)}g lemak
                </div>
              </div>
              <span style={{ font: "800 15px var(--font-archivo), sans-serif", color: "var(--acc)", whiteSpace: "nowrap" }}>
                {formatNumber(l.protein_g)}g
              </span>
            </div>
          ))}
        </div>
      )}

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

      {chatOpen && (
        <NutritionChat
          onClose={() => setChatOpen(false)}
          onLogged={(res) => {
            const t = res.totals;
            if (typeof res.proteinNow === "number") {
              setProteinNow(res.proteinNow);
            } else if (t) {
              setProteinNow((p) => p + t.protein_g);
            }
            if (res.items?.length) {
              const added = res.items.map((it) => ({
                food_name: it.name,
                protein_g: it.protein_g,
                carb_g: it.carb_g,
                fat_g: it.fat_g,
                calories: Math.round(it.calories),
              }));
              setLogs((prev) => [...added, ...prev]);
            }
            if (t && t.protein_g > 0) toast.success(`+${t.protein_g}g protein tercatat`);
          }}
        />
      )}
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
