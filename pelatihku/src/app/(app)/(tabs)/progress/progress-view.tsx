"use client";

import { logBodyweight, ProgressData } from "@/features/progress/action";
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Stat label="Sesi total" value={String(data.totalSessions)} color="var(--ink)" />
        <Stat label="Streak terpanjang" value={`${data.longestStreak}🔥`} color="#ff9a5c" />
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

      <div style={{ marginTop: 14, textAlign: "center", font: "600 12px var(--font-jakarta), sans-serif", color: "var(--faint)" }}>
        Total beban terangkat: {formatNumber(data.volumeSeries.reduce((a, v) => a + v.volume, 0))} kg
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ borderRadius: 18, padding: 16, background: "var(--surface)", border: "1px solid var(--line2)" }}>
      <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>{label}</div>
      <div style={{ font: "900 26px var(--font-archivo), sans-serif", color, marginTop: 4 }}>{value}</div>
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
