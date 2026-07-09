"use client";

import BackdateSelector, {
  backdateLabel,
} from "@/components/common/backdate-selector";
import { FOOD_EXAMPLES } from "@/constants/nutrition-constant";
import { GOAL_LABEL } from "@/constants/labels";
import {
  deleteFood,
  getNutritionLogsForDate,
  logFood,
  NutritionData,
} from "@/features/nutrition/action";
import { evaluateIntake } from "@/features/nutrition/evaluate";
import { MealPlanItem } from "@/features/nutrition/recommend";
import { useDebounce } from "@/hooks/use-debounce";
import { formatNumber } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import MealPlanCard from "./meal-plan-card";
import NutritionChat from "./nutrition-chat";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DayLog = {
  id: string;
  food_name: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  calories: number;
};

// Beberapa entri makanan yang identik (nama + makro sama) digabung jadi satu
// baris berjumlah ×N. `ids` menyimpan id tiap entri asli agar bisa
// ditambah/dikurangi/dihapus satuan.
type GroupedLog = DayLog & { ids: string[] };

// Batas jumlah baris sebelum daftar bisa diciutkan agar tak terlalu panjang.
const COLLAPSE_THRESHOLD = 4;

function groupLogs(logs: DayLog[]): GroupedLog[] {
  const groups: GroupedLog[] = [];
  const byKey = new Map<string, GroupedLog>();
  for (const l of logs) {
    const key = `${l.food_name}|${l.protein_g}|${l.carb_g}|${l.fat_g}|${l.calories}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.ids.push(l.id);
    } else {
      const g: GroupedLog = { ...l, ids: [l.id] };
      byKey.set(key, g);
      groups.push(g);
    }
  }
  return groups;
}

export default function NutritionView({ data }: { data: NutritionData }) {
  const [adding, setAdding] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateLoading, setDateLoading] = useState(false);
  const isToday = selectedDate === todayStr();
  const [logs, setLogs] = useState<DayLog[]>(() =>
    data.logs.map((l) => ({
      id: l.id,
      food_name: l.food_name,
      protein_g: Number(l.protein_g) || 0,
      carb_g: Number(l.carb_g) || 0,
      fat_g: Number(l.fat_g) || 0,
      calories: Number(l.calories) || 0,
    })),
  );

  const totals = useMemo(
    () =>
      logs.reduce(
        (t, l) => ({
          protein: t.protein + l.protein_g,
          carb: t.carb + l.carb_g,
          fat: t.fat + l.fat_g,
          calories: t.calories + l.calories,
        }),
        { protein: 0, carb: 0, fat: 0, calories: 0 },
      ),
    [logs],
  );

  const groups = useMemo(() => groupLogs(logs), [logs]);
  const visibleGroups = expanded ? groups : groups.slice(0, COLLAPSE_THRESHOLD);
  const hiddenCount = groups.length - visibleGroups.length;

  const filteredFoods = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return FOOD_EXAMPLES;
    return FOOD_EXAMPLES.filter((f) => f.name.toLowerCase().includes(q));
  }, [debouncedSearch]);

  // Evaluasi asupan yang tegas — deterministik, langsung dari data hari ini.
  const verdicts = useMemo(
    () =>
      evaluateIntake({
        calories: totals.calories,
        protein: totals.protein,
        carb: totals.carb,
        fat: totals.fat,
        calorieTarget: data.calorieTarget,
        proteinTarget: data.proteinTarget,
        carbTarget: data.carbTarget,
        fatTarget: data.fatTarget,
        goal: data.goal,
        foodNames: logs.map((l) => l.food_name),
        lastSession: data.lastSession,
      }),
    [totals, logs, data],
  );

  const circumference = 2 * Math.PI * 50;
  const kcalPct = data.calorieTarget
    ? Math.min(1, totals.calories / data.calorieTarget)
    : 0;
  const kcalDash = `${circumference * kcalPct} ${circumference}`;

  // Berpindah tanggal: ambil catatan makan tanggal itu lalu ganti daftar.
  async function changeDate(date: string) {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setExpanded(false);
    setDateLoading(true);
    const fetched = await getNutritionLogsForDate(date);
    setDateLoading(false);
    setLogs(
      fetched.map((l) => ({
        id: l.id,
        food_name: l.food_name,
        protein_g: Number(l.protein_g) || 0,
        carb_g: Number(l.carb_g) || 0,
        fat_g: Number(l.fat_g) || 0,
        calories: Number(l.calories) || 0,
      })),
    );
  }

  async function add(food: (typeof FOOD_EXAMPLES)[number]) {
    setAdding(food.name);
    const res = await logFood({
      food_name: food.name,
      protein_g: food.protein_g,
      carb_g: food.carb_g,
      fat_g: food.fat_g,
      calories: food.calories,
      log_date: selectedDate,
    });
    setAdding(null);
    if (res.error || !res.id) {
      toast.error(res.error ?? "Gagal menyimpan.");
      return;
    }
    setLogs((prev) => [
      {
        id: res.id!,
        food_name: food.name,
        protein_g: food.protein_g,
        carb_g: food.carb_g,
        fat_g: food.fat_g,
        calories: food.calories,
      },
      ...prev,
    ]);
    toast.success(`+${food.protein_g}g protein dari ${food.name}`);
  }

  // Catat item dari rekomendasi AI ke log harian.
  async function addPlanItem(item: MealPlanItem): Promise<boolean> {
    const res = await logFood({
      food_name: item.food_name,
      protein_g: item.protein_g,
      carb_g: item.carb_g,
      fat_g: item.fat_g,
      calories: item.calories,
      log_date: selectedDate,
    });
    if (res.error || !res.id) {
      toast.error(res.error ?? "Gagal menyimpan.");
      return false;
    }
    setLogs((prev) => [
      {
        id: res.id!,
        food_name: item.food_name,
        protein_g: item.protein_g,
        carb_g: item.carb_g,
        fat_g: item.fat_g,
        calories: item.calories,
      },
      ...prev,
    ]);
    toast.success(`${item.food_name} dicatat`);
    return true;
  }

  // Tambah satu satuan lagi ke grup identik (fitur "dikalikan").
  async function addUnit(g: GroupedLog) {
    setBusyKey(g.food_name + g.ids.length);
    const res = await logFood({
      food_name: g.food_name,
      protein_g: g.protein_g,
      carb_g: g.carb_g,
      fat_g: g.fat_g,
      calories: g.calories,
      log_date: selectedDate,
    });
    setBusyKey(null);
    if (res.error || !res.id) {
      toast.error(res.error ?? "Gagal menyimpan.");
      return;
    }
    setLogs((prev) => [
      {
        id: res.id!,
        food_name: g.food_name,
        protein_g: g.protein_g,
        carb_g: g.carb_g,
        fat_g: g.fat_g,
        calories: g.calories,
      },
      ...prev,
    ]);
  }

  // Hapus satu satuan dari grup (kurangi ×N).
  async function removeUnit(g: GroupedLog) {
    const id = g.ids[g.ids.length - 1];
    setBusyKey(g.food_name + g.ids.length);
    const res = await deleteFood(id);
    setBusyKey(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  // Hapus seluruh grup (semua satuan) sekaligus.
  async function removeGroup(g: GroupedLog) {
    setBusyKey(g.food_name + g.ids.length);
    const results = await Promise.all(g.ids.map((id) => deleteFood(id)));
    setBusyKey(null);
    const failed = results.find((r) => r.error);
    if (failed) {
      toast.error(failed.error!);
      return;
    }
    const gone = new Set(g.ids);
    setLogs((prev) => prev.filter((l) => !gone.has(l.id)));
    toast.success(`${g.food_name} dihapus`);
  }

  return (
    // Wrapper luar TIDAK ikut scroll — overlay chat menempel ke frame yang
    // terlihat, bukan ke konten yang sudah tergulir (dulu konten lain bocor
    // di bawah sheet saat halaman sedang di-scroll).
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflowY: chatOpen ? "hidden" : "auto",
          padding: "6px 20px 120px",
        }}
        className="no-scrollbar"
      >
        <div style={{ padding: "8px 0 16px" }}>
          <div
            style={{
              font: "800 11px var(--font-archivo), sans-serif",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "var(--acc)",
            }}
          >
            Nutrisi
          </div>
          <h1
            style={{
              font: "900 26px var(--font-archivo), sans-serif",
              color: "var(--ink)",
              margin: "6px 0 0",
            }}
          >
            Target harianmu
          </h1>
        </div>

        {/* pemilih tanggal — catat makan yang kelewat di hari sebelumnya */}
        <div style={{ marginBottom: 14 }}>
          <BackdateSelector value={selectedDate} onChange={changeDate} />
        </div>

        {!isToday && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 14,
              padding: "11px 14px",
              background: "rgba(255,154,92,.1)",
              border: "1px solid rgba(255,154,92,.26)",
              font: "600 12.5px/1.5 var(--font-jakarta), sans-serif",
              color: "#ff9a5c",
            }}
          >
            Mencatat asupan untuk <b>{backdateLabel(selectedDate)}</b>. Makanan
            yang kamu tambahkan masuk ke tanggal itu.
          </div>
        )}

        {/* catat via chat / suara — hanya untuk hari ini */}
        {isToday && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            width: "100%",
            textAlign: "left",
            borderRadius: 18,
            padding: "14px 16px",
            marginBottom: 14,
            background:
              "linear-gradient(120deg,rgba(201,251,60,.14),rgba(201,251,60,.05))",
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
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10130a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                font: "800 14.5px var(--font-archivo), sans-serif",
                color: "var(--ink)",
              }}
            >
              Catat makan pakai chat / suara
            </div>
            <div
              style={{
                font: "500 12px var(--font-jakarta), sans-serif",
                color: "var(--dim)",
                marginTop: 2,
              }}
            >
              “Nasi, ayam 1 potong, bayam, tempe” — makro dihitung otomatis
            </div>
          </div>
          <span style={{ fontSize: 20, color: "var(--acc)" }}>›</span>
        </button>
        )}

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
          <div
            style={{
              position: "relative",
              width: 118,
              height: 118,
              flex: "none",
            }}
          >
            <svg
              width="118"
              height="118"
              viewBox="0 0 118 118"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="59"
                cy="59"
                r="50"
                fill="none"
                stroke="var(--raised)"
                strokeWidth="13"
              />
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  font: "900 26px var(--font-archivo), sans-serif",
                  color: "var(--ink)",
                }}
              >
                {formatNumber(data.calorieTarget)}
              </span>
              <span
                style={{
                  font: "600 11px var(--font-jakarta), sans-serif",
                  color: "var(--dim)",
                }}
              >
                kkal/hari
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                font: "600 13px var(--font-jakarta), sans-serif",
                color: "var(--dim)",
                marginBottom: 4,
              }}
            >
              Estimasi dari profil & tujuan
            </div>
            <div
              style={{
                font: "700 14px var(--font-archivo), sans-serif",
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              {GOAL_LABEL[data.goal] ?? data.goal}
            </div>
            {data.bmi && (
              <div
                style={{
                  font: "600 12.5px var(--font-jakarta), sans-serif",
                  color: "var(--dim)",
                  marginTop: 6,
                }}
              >
                BMI kamu {data.bmi} · {data.bmiCategory}
              </div>
            )}
          </div>
        </div>

        {/* macros */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginTop: 14,
          }}
        >
          <Macro
            value={`${data.proteinTarget}g`}
            label="Protein"
            color="var(--acc)"
          />
          <Macro value={`${data.carbTarget}g`} label="Karbo" color="#7cc4ff" />
          <Macro value={`${data.fatTarget}g`} label="Lemak" color="#ff9a5c" />
        </div>

        {/* macro progress today */}
        <div
          style={{
            marginTop: 18,
            borderRadius: 18,
            padding: 18,
            background: "var(--surface)",
            border: "1px solid var(--line2)",
          }}
        >
          <div
            style={{
              font: "700 14px var(--font-archivo), sans-serif",
              color: "var(--ink)",
              marginBottom: 14,
            }}
          >
            Asupan {isToday ? "hari ini" : backdateLabel(selectedDate)}
          </div>
          <MacroBar
            label="Kalori"
            now={totals.calories}
            target={data.calorieTarget}
            unit=" kkal"
            color="#C9FB3C"
          />
          <MacroBar
            label="Protein"
            now={totals.protein}
            target={data.proteinTarget}
            unit=" g"
            color="#C9FB3C"
          />
          <MacroBar
            label="Karbo"
            now={totals.carb}
            target={data.carbTarget}
            unit=" g"
            color="#7cc4ff"
          />
          <MacroBar
            label="Lemak"
            now={totals.fat}
            target={data.fatTarget}
            unit=" g"
            color="#ff9a5c"
            last
          />
        </div>

        {/* evaluasi tegas asupan hari ini */}
        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            padding: 18,
            background: "var(--surface)",
            border: "1px solid var(--line2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 15 }}>🧭</span>
            <span
              style={{
                font: "700 14px var(--font-archivo), sans-serif",
                color: "var(--ink)",
              }}
            >
              Evaluasi coach
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {verdicts.map((vd, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "flex-start",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background:
                    vd.tone === "bad"
                      ? "rgba(255,107,107,.1)"
                      : vd.tone === "warn"
                        ? "rgba(255,154,92,.09)"
                        : "rgba(201,251,60,.08)",
                  border: `1px solid ${
                    vd.tone === "bad"
                      ? "rgba(255,107,107,.3)"
                      : vd.tone === "warn"
                        ? "rgba(255,154,92,.26)"
                        : "rgba(201,251,60,.2)"
                  }`,
                }}
              >
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {vd.tone === "bad" ? "🛑" : vd.tone === "warn" ? "⚠️" : "✅"}
                </span>
                <span
                  style={{
                    font: "600 12.5px/1.55 var(--font-jakarta), sans-serif",
                    color:
                      vd.tone === "bad"
                        ? "#ff8080"
                        : vd.tone === "warn"
                          ? "#ff9a5c"
                          : "var(--acc)",
                  }}
                >
                  {vd.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* rekomendasi asupan harian (AI) — hanya relevan untuk hari ini */}
        {isToday && <MealPlanCard onLog={addPlanItem} />}

        {/* today's food history */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              font: "800 11px var(--font-archivo), sans-serif",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--dim)",
            }}
          >
            Sudah dimakan {isToday ? "hari ini" : backdateLabel(selectedDate)}
          </span>
          {groups.length > 0 && (
            <span
              style={{
                font: "700 12px var(--font-archivo), sans-serif",
                color: "var(--acc)",
              }}
            >
              {logs.length} item
            </span>
          )}
        </div>
        {dateLoading ? (
          <div
            style={{
              borderRadius: 16,
              padding: "18px 16px",
              background: "var(--surface)",
              border: "1px dashed var(--line2)",
              textAlign: "center",
              font: "500 13px var(--font-jakarta), sans-serif",
              color: "var(--dim)",
            }}
          >
            Memuat catatan {backdateLabel(selectedDate)}…
          </div>
        ) : groups.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              padding: "18px 16px",
              background: "var(--surface)",
              border: "1px dashed var(--line2)",
              textAlign: "center",
              font: "500 13px var(--font-jakarta), sans-serif",
              color: "var(--dim)",
            }}
          >
            {isToday
              ? "Belum ada catatan. Ketuk “Catat makan pakai chat / suara” di atas, atau pilih dari daftar di bawah."
              : `Belum ada catatan untuk ${backdateLabel(selectedDate)}. Pilih makanan dari daftar di bawah untuk mencatatnya.`}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleGroups.map((g) => {
              const qty = g.ids.length;
              const busy = busyKey === g.food_name + qty;
              return (
                <div
                  key={g.ids[0]}
                  style={{
                    borderRadius: 14,
                    padding: "11px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--line2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: busy ? 0.55 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                      <span
                        style={{
                          font: "700 14px var(--font-archivo), sans-serif",
                          color: "var(--ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {g.food_name}
                      </span>
                      {qty > 1 && (
                        <span
                          style={{
                            flex: "none",
                            font: "800 11px var(--font-archivo), sans-serif",
                            color: "#10130a",
                            background: "var(--lime)",
                            borderRadius: 7,
                            padding: "2px 6px",
                          }}
                        >
                          ×{qty}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        font: "500 11.5px var(--font-jakarta), sans-serif",
                        color: "var(--dim)",
                        marginTop: 2,
                      }}
                    >
                      {Math.round(g.calories * qty)} kkal ·{" "}
                      {formatNumber(g.carb_g * qty)}g karbo ·{" "}
                      {formatNumber(g.fat_g * qty)}g lemak
                    </div>
                  </div>

                  <span
                    style={{
                      font: "800 15px var(--font-archivo), sans-serif",
                      color: "var(--acc)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatNumber(g.protein_g * qty)}g
                  </span>

                  {/* stepper ± untuk mengalikan porsi */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flex: "none",
                    }}
                  >
                    <StepBtn
                      label="Kurangi"
                      disabled={busy}
                      onClick={() => removeUnit(g)}
                    >
                      –
                    </StepBtn>
                    <StepBtn
                      label="Tambah"
                      disabled={busy}
                      onClick={() => addUnit(g)}
                    >
                      +
                    </StepBtn>
                  </div>

                  {/* hapus seluruh entri */}
                  <button
                    onClick={() => removeGroup(g)}
                    disabled={busy}
                    aria-label={`Hapus ${g.food_name}`}
                    style={{
                      flex: "none",
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: "transparent",
                      border: "1px solid var(--line2)",
                      color: "var(--dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {(hiddenCount > 0 || expanded) &&
              groups.length > COLLAPSE_THRESHOLD && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  style={{
                    borderRadius: 12,
                    padding: "9px 12px",
                    background: "transparent",
                    border: "1px dashed var(--line2)",
                    color: "var(--acc)",
                    font: "700 12.5px var(--font-archivo), sans-serif",
                    textAlign: "center",
                  }}
                >
                  {expanded ? "Ciutkan" : `Lihat semua (${hiddenCount} lagi)`}
                </button>
              )}
          </div>
        )}

        {/* protein sources */}
        <div
          style={{
            marginTop: 20,
            font: "800 11px var(--font-archivo), sans-serif",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--dim)",
            marginBottom: 10,
          }}
        >
          Protein murah & lokal — ketuk untuk catat
        </div>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--dim)"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari makanan… (mis. telur, ikan, susu)"
            aria-label="Cari makanan"
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              borderRadius: 14,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              font: "500 13.5px var(--font-jakarta), sans-serif",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredFoods.length === 0 && (
            <div
              style={{
                borderRadius: 16,
                padding: "16px 14px",
                background: "var(--surface)",
                border: "1px dashed var(--line2)",
                textAlign: "center",
                font: "500 13px var(--font-jakarta), sans-serif",
                color: "var(--dim)",
              }}
            >
              Tidak ada yang cocok dengan “{debouncedSearch}”. Coba kata lain,
              atau catat lewat chat di atas.
            </div>
          )}
          {filteredFoods.map((food) => (
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    font: "700 15px var(--font-archivo), sans-serif",
                    color: "var(--ink)",
                  }}
                >
                  {food.name}
                </div>
                <div
                  style={{
                    font: "500 12px var(--font-jakarta), sans-serif",
                    color: "var(--dim)",
                    marginTop: 2,
                  }}
                >
                  {food.portion} · {food.calories} kkal ·{" "}
                  {formatNumber(food.carb_g)}g karbo ·{" "}
                  {formatNumber(food.fat_g)}g lemak
                </div>
              </div>
              <span
                style={{
                  font: "800 16px var(--font-archivo), sans-serif",
                  color: "var(--acc)",
                  flex: "none",
                }}
              >
                {food.protein_g}g
              </span>
              <span
                style={{
                  fontSize: 22,
                  color: "var(--acc)",
                  lineHeight: 1,
                  flex: "none",
                }}
              >
                +
              </span>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            borderRadius: 14,
            padding: "14px 16px",
            background: "rgba(201,251,60,.06)",
            border: "1px dashed rgba(201,251,60,.2)",
            font: "500 12.5px/1.5 var(--font-jakarta), sans-serif",
            color: "var(--dim)",
          }}
        >
          Hasil 70–80% ditentukan total kalori, protein, & tidur — bukan
          suplemen. Susu/whey hanya pelengkap. Angka ini estimasi, bukan nasihat
          medis.
        </div>
      </div>

      {chatOpen && (
        <NutritionChat
          onClose={() => setChatOpen(false)}
          onResult={(res) => {
            if (res.logs) {
              setLogs(
                res.logs.map((l) => ({
                  id: l.id,
                  food_name: l.food_name,
                  protein_g: l.protein_g,
                  carb_g: l.carb_g,
                  fat_g: l.fat_g,
                  calories: l.calories,
                })),
              );
            }
            if (res.changed) toast.success("Catatan makanan diperbarui");
          }}
        />
      )}
    </div>
  );
}

function StepBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "var(--raised)",
        border: "1px solid var(--line2)",
        color: "var(--ink)",
        font: "800 17px var(--font-archivo), sans-serif",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function MacroBar({
  label,
  now,
  target,
  unit,
  color,
  last,
}: {
  label: string;
  now: number;
  target: number;
  unit: string;
  color: string;
  last?: boolean;
}) {
  const pct = target ? Math.min(100, Math.round((now / target) * 100)) : 0;
  const over = target > 0 && now > target;
  const barColor = over ? "#ff6b6b" : color;
  return (
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            font: "600 12.5px var(--font-jakarta), sans-serif",
            color: "var(--dim)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            font: "700 12.5px var(--font-archivo), sans-serif",
            color: over ? "#ff6b6b" : "var(--ink)",
          }}
        >
          {formatNumber(Math.round(now))}
          <span style={{ color: "var(--dim)" }}>
            {" "}
            / {formatNumber(target)}
            {unit}
          </span>
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 8,
          background: "var(--track)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 8,
            background: barColor,
            transition: "width .4s ease",
          }}
        />
      </div>
    </div>
  );
}

function Macro({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        background: "var(--surface)",
        border: "1px solid var(--line2)",
        textAlign: "center",
      }}
    >
      <div style={{ font: "900 22px var(--font-archivo), sans-serif", color }}>
        {value}
      </div>
      <div
        style={{
          font: "600 11px var(--font-jakarta), sans-serif",
          color: "var(--dim)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
