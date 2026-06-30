"use client";

import { signOutAction } from "@/features/auth/action";
import { logBodyweight, ProgressData } from "@/features/progress/action";
import { GOAL_LABEL, LEVEL_LABEL } from "@/constants/labels";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
} from "recharts";

export default function ProgressView({ data }: { data: ProgressData }) {
  const router = useRouter();
  const [weight, setWeight] = useState<number>(data.latestWeight ?? 65);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function save() {
    setSaving(true);
    const res = await logBodyweight(weight);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Berat badan tercatat.");
    router.refresh();
  }

  async function logout() {
    setLoggingOut(true);
    await signOutAction();
    router.replace("/login");
  }

  const initial = (data.name?.trim()?.[0] ?? "A").toUpperCase();
  const badges = [
    data.goal ? GOAL_LABEL[data.goal] ?? data.goal : null,
    data.experienceLevel
      ? LEVEL_LABEL[data.experienceLevel] ?? data.experienceLevel
      : null,
  ].filter(Boolean) as string[];

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--acc)" }}>
          Progres
        </div>
        <h1 style={{ font: "900 26px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "6px 0 0" }}>
          Perjalananmu
        </h1>
      </div>

      {/* profile header */}
      <div style={{ borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              flex: "none",
              background: "linear-gradient(150deg,#cdf93f,#9fe119)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "900 24px var(--font-archivo), sans-serif",
              color: "#10130a",
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "900 20px var(--font-archivo), sans-serif", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {data.name}
            </div>
            {badges.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {badges.map((b) => (
                  <span
                    key={b}
                    style={{
                      font: "700 11px var(--font-archivo), sans-serif",
                      color: "var(--acc)",
                      background: "rgba(201,251,60,.12)",
                      border: "1px solid var(--line2)",
                      borderRadius: 999,
                      padding: "4px 10px",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 13,
            borderRadius: 14,
            background: "var(--raised)",
            border: "1px solid var(--line2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            font: "800 14px var(--font-archivo), sans-serif",
            color: "#ff6b6b",
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          {loggingOut ? "Keluar…" : "Keluar"}
        </button>
      </div>

      {/* key stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <Stat label="Sesi total" value={String(data.totalSessions)} color="var(--ink)" />
        <Stat label="Sesi minggu ini" value={String(data.thisWeekSessions)} color="var(--acc)" />
        <Stat label="Streak saat ini" value={`${data.currentStreak}🔥`} color="#ff9a5c" />
        <Stat label="Streak terpanjang" value={`${data.longestStreak}🔥`} color="#ff9a5c" />
      </div>

      {/* physical stats */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)", marginBottom: 14 }}>
          Statistik tubuh
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <Mini label="Berat" value={data.latestWeight !== null ? String(data.latestWeight) : "–"} unit="kg" />
          <Mini label="Tinggi" value={data.heightCm !== null ? String(data.heightCm) : "–"} unit="cm" />
          <Mini label="BMI" value={data.bmi !== null ? String(data.bmi) : "–"} unit="" />
          <Mini label="Usia" value={data.age !== null ? String(data.age) : "–"} unit="th" />
        </div>
      </div>

      {/* targets */}
      {(data.calorieTarget !== null || data.proteinTarget !== null) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <Stat label="Target kalori" value={data.calorieTarget !== null ? `${formatNumber(data.calorieTarget)}` : "–"} color="var(--ink)" suffix=" kkal" />
          <Stat label="Target protein" value={data.proteinTarget !== null ? `${data.proteinTarget}` : "–"} color="var(--ink)" suffix=" g" />
        </div>
      )}

      {/* training volume summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <Stat label="Total beban terangkat" value={formatNumber(data.totalVolume)} color="var(--acc)" suffix=" kg" />
        <Stat label="Rata-rata per sesi" value={formatNumber(data.avgVolume)} color="var(--ink)" suffix=" kg" />
      </div>

      {/* weight chart */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <span style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Berat badan
          </span>
          {data.weightDelta !== null && (
            <span style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
              {data.weightDelta > 0 ? "+" : ""}
              {data.weightDelta} kg
            </span>
          )}
        </div>
        {data.weightSeries.length >= 2 ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data.weightSeries} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="pkw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#C9FB3C" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#C9FB3C" stopOpacity="0" />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#C9FB3C"
                strokeWidth={3}
                fill="url(#pkw)"
                dot={{ r: 3, fill: "#C9FB3C" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyHint text="Catat beratmu beberapa kali untuk melihat grafik." />
        )}
      </div>

      {/* volume bars */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)", marginBottom: 14 }}>
          Total beban per minggu
        </div>
        {data.volumeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.volumeSeries} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Bar dataKey="volume" fill="#C9FB3C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyHint text="Selesaikan sesi latihan untuk melihat volume." />
        )}
      </div>

      {/* log bodyweight */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)", marginBottom: 14 }}>
          Catat berat hari ini
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setWeight((w) => Math.max(30, w - 0.5))} style={miniBtn}>−</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ font: "900 28px var(--font-archivo), sans-serif", color: "var(--ink)" }}>{weight}</span>
            <span style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--dim)" }}> kg</span>
          </div>
          <button onClick={() => setWeight((w) => Math.min(250, w + 0.5))} style={miniBtn}>+</button>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            background: "var(--lime)",
            color: "#10130a",
            font: "800 15px var(--font-archivo), sans-serif",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Menyimpan…" : "Simpan berat"}
        </button>
      </div>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  background: "var(--raised)",
  font: "600 24px var(--font-archivo), sans-serif",
  color: "var(--ink2)",
};

function Stat({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: string;
  color: string;
  suffix?: string;
}) {
  return (
    <div style={{ borderRadius: 18, padding: 16, background: "var(--surface)", border: "1px solid var(--line2)" }}>
      <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>{label}</div>
      <div style={{ font: "900 26px var(--font-archivo), sans-serif", color, marginTop: 4 }}>
        {value}
        {suffix && <span style={{ fontSize: 13, color: "var(--dim)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ font: "900 20px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
        {value}
        {unit && <span style={{ fontSize: 11, color: "var(--dim)" }}> {unit}</span>}
      </div>
      <div style={{ font: "600 11px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", font: "500 13px var(--font-jakarta), sans-serif", color: "var(--faint)", textAlign: "center" }}>
      {text}
    </div>
  );
}
