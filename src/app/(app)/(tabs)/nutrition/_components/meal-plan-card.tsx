"use client";

import {
  generateMealPlan,
  MealPlan,
  MealPlanItem,
} from "@/features/nutrition/recommend";
import { formatNumber } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function storageKey() {
  return `pk-mealplan-${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Kartu "Rekomendasi asupan hari ini": AI menyusun daftar makanan untuk
 * menutup sisa target makro (berdasarkan progres & sesi latihan terakhir),
 * tiap item bisa langsung dicatat ke log harian. Hasil disimpan di
 * localStorage supaya tidak hilang saat halaman dibuka ulang di hari yang sama.
 */
export default function MealPlanCard({
  onLog,
}: {
  onLog: (item: MealPlanItem) => Promise<boolean>;
}) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw) {
        const saved = JSON.parse(raw) as { plan: MealPlan; added: string[] };
        setPlan(saved.plan);
        setAdded(new Set(saved.added ?? []));
      }
    } catch {}
  }, []);

  function persist(nextPlan: MealPlan | null, nextAdded: Set<string>) {
    try {
      if (nextPlan) {
        localStorage.setItem(
          storageKey(),
          JSON.stringify({ plan: nextPlan, added: [...nextAdded] }),
        );
      }
    } catch {}
  }

  async function generate() {
    setBusy(true);
    const res = await generateMealPlan();
    setBusy(false);
    if (res.error || !res.plan) {
      toast.error(res.error ?? "Gagal menyusun rekomendasi.");
      return;
    }
    setPlan(res.plan);
    setAdded(new Set());
    persist(res.plan, new Set());
  }

  async function logItem(item: MealPlanItem) {
    setLogging(item.food_name);
    const ok = await onLog(item);
    setLogging(null);
    if (!ok) return;
    setAdded((prev) => {
      const next = new Set(prev).add(item.food_name);
      persist(plan, next);
      return next;
    });
  }

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 18,
        padding: 18,
        background: "var(--surface)",
        border: "1px solid var(--line2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>✨</span>
        <span style={{ flex: 1, font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
          Rekomendasi asupan hari ini
        </span>
        <button
          onClick={generate}
          disabled={busy}
          style={{
            padding: "8px 14px",
            borderRadius: 11,
            background: "var(--lime)",
            color: "#10130a",
            font: "800 12.5px var(--font-archivo), sans-serif",
            opacity: busy ? 0.6 : 1,
            flex: "none",
          }}
        >
          {busy ? "Menyusun…" : plan ? "Susun ulang" : "Generate"}
        </button>
      </div>

      {!plan && !busy && (
        <div style={{ font: "500 12.5px/1.55 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 6 }}>
          AI menyusun apa yang sebaiknya kamu makan hari ini dari sisa target
          makro, progres berat badan, dan sesi latihan terakhirmu — lengkap
          dengan yang harus dihindari.
        </div>
      )}

      {busy && (
        <div style={{ display: "flex", gap: 5, padding: "14px 0 6px" }}>
          {[0, 0.2, 0.4].map((d) => (
            <span
              key={d}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--lime)",
                animation: `pk-dot 1.2s ${d}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {plan && !busy && (
        <div style={{ marginTop: 10 }}>
          {plan.summary && (
            <div
              style={{
                font: "600 12.5px/1.55 var(--font-jakarta), sans-serif",
                color: "var(--ink2)",
                borderRadius: 12,
                padding: "10px 12px",
                background: "rgba(201,251,60,.07)",
                border: "1px solid rgba(201,251,60,.18)",
                marginBottom: 12,
              }}
            >
              {plan.summary}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.meals.map((m) => {
              const isAdded = added.has(m.food_name);
              const isLogging = logging === m.food_name;
              return (
                <div
                  key={m.food_name}
                  style={{
                    borderRadius: 14,
                    padding: "11px 13px",
                    background: "var(--raised)",
                    border: "1px solid var(--line2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: isLogging ? 0.6 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "700 13.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                      {m.food_name}
                    </div>
                    <div style={{ font: "500 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                      {m.portion} · {m.calories} kkal · {formatNumber(m.protein_g)}g P · {formatNumber(m.carb_g)}g K · {formatNumber(m.fat_g)}g L
                    </div>
                    {m.reason && (
                      <div style={{ font: "500 11px/1.45 var(--font-jakarta), sans-serif", color: "var(--faint)", marginTop: 3 }}>
                        {m.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => logItem(m)}
                    disabled={isAdded || isLogging}
                    aria-label={isAdded ? `${m.food_name} sudah dicatat` : `Catat ${m.food_name}`}
                    style={{
                      flex: "none",
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: isAdded ? "var(--raised)" : "rgba(201,251,60,.12)",
                      border: `1px solid ${isAdded ? "var(--line2)" : "rgba(201,251,60,.3)"}`,
                      color: isAdded ? "var(--dim)" : "var(--acc)",
                      font: "800 12px var(--font-archivo), sans-serif",
                    }}
                  >
                    {isAdded ? "✓" : "+ Catat"}
                  </button>
                </div>
              );
            })}
          </div>

          {plan.avoid.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  font: "800 10.5px var(--font-archivo), sans-serif",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "#ff8080",
                  marginBottom: 8,
                }}
              >
                Hindari / kurangi
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.avoid.map((a) => (
                  <div
                    key={a.item}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      borderRadius: 12,
                      padding: "9px 12px",
                      background: "rgba(255,107,107,.08)",
                      border: "1px solid rgba(255,107,107,.24)",
                    }}
                  >
                    <span style={{ fontSize: 12, lineHeight: 1.5 }}>🚫</span>
                    <span style={{ font: "600 12px/1.5 var(--font-jakarta), sans-serif", color: "#ff8080" }}>
                      <b>{a.item}</b> — {a.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
