"use client";

import InstallButton from "@/components/common/install-button";
import FeedbackCard from "./feedback-card";
import { signOutAction } from "@/features/auth/action";
import {
  logBodyweight,
  ProgressData,
  resetGoalAndProgress,
  updateBodyProfile,
} from "@/features/progress/action";
import { GOAL_LABEL, LEVEL_LABEL } from "@/constants/labels";
import { nextLevelTarget } from "@/features/progress/level";
import { ExperienceLevel } from "@/types/profile";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
} from "recharts";

export default function ProgressView({ data }: { data: ProgressData }) {
  const router = useRouter();
  const [weight, setWeight] = useState<number>(data.latestWeight ?? 65);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [ageDraft, setAgeDraft] = useState<number>(data.age ?? 25);
  const [heightDraft, setHeightDraft] = useState<number>(data.heightCm ?? 165);
  const [savingBody, setSavingBody] = useState(false);

  async function saveBody() {
    setSavingBody(true);
    const res = await updateBodyProfile({ age: ageDraft, heightCm: heightDraft });
    setSavingBody(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Umur & tinggi diperbarui. Target gizi dihitung ulang.");
    setEditingBody(false);
    router.refresh();
  }

  async function reset() {
    setResetting(true);
    const res = await resetGoalAndProgress();
    if (res.error) {
      setResetting(false);
      setConfirmReset(false);
      toast.error(res.error);
      return;
    }
    toast.success("Progres direset. Ayo tentukan tujuan baru!");
    router.replace("/onboarding");
  }

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

      {/* install PWA */}
      <InstallButton />

      {/* support mimin */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "linear-gradient(140deg,rgba(201,251,60,.12),rgba(201,251,60,.04))", border: "1px solid rgba(201,251,60,.28)" }}>
        <div style={{ font: "800 15px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
          Dukung mimin 💚
        </div>
        <div style={{ font: "500 12.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 4, marginBottom: 14 }}>
          Follow biar app ini terus dikembangkan & tetap gratis. Makasih ya!
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SOCIAL_LINKS.map((s) => (
            <SocialLink key={s.label} {...s} />
          ))}
        </div>
      </div>

      {/* saran & laporan bug */}
      <FeedbackCard />

      {/* key stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <Stat label="Sesi total" value={String(data.totalSessions)} color="var(--ink)" />
        <Stat label="Sesi minggu ini" value={String(data.thisWeekSessions)} color="var(--acc)" />
        <Stat label="Streak saat ini" value={`${data.currentStreak}🔥`} color="#ff9a5c" />
        <Stat label="Streak terpanjang" value={`${data.longestStreak}🔥`} color="#ff9a5c" />
      </div>

      {/* target menuju level berikutnya */}
      <LevelTargetCard
        level={(data.experienceLevel as ExperienceLevel | null) ?? "pemula"}
        consistentWeeks={data.consistentWeeks}
      />

      {/* physical stats */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            Statistik tubuh
          </span>
          <button
            onClick={() => {
              setAgeDraft(data.age ?? 25);
              setHeightDraft(data.heightCm ?? 165);
              setEditingBody((v) => !v);
            }}
            aria-label={editingBody ? "Tutup edit" : "Ubah umur & tinggi"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              borderRadius: 10,
              background: editingBody ? "var(--raised)" : "rgba(201,251,60,.1)",
              border: `1px solid ${editingBody ? "var(--line2)" : "rgba(201,251,60,.25)"}`,
              color: editingBody ? "var(--dim)" : "var(--acc)",
              font: "700 12px var(--font-archivo), sans-serif",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
            {editingBody ? "Batal" : "Ubah"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <Mini label="Berat" value={data.latestWeight !== null ? String(data.latestWeight) : "–"} unit="kg" />
          <Mini label="Tinggi" value={data.heightCm !== null ? String(data.heightCm) : "–"} unit="cm" />
          <Mini label="BMI" value={data.bmi !== null ? String(data.bmi) : "–"} unit="" />
          <Mini label="Usia" value={data.age !== null ? String(data.age) : "–"} unit="th" />
        </div>

        {editingBody && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--line2)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <EditRow
              label="Usia"
              unit="th"
              value={ageDraft}
              onDec={() => setAgeDraft((v) => Math.max(10, v - 1))}
              onInc={() => setAgeDraft((v) => Math.min(100, v + 1))}
            />
            <EditRow
              label="Tinggi"
              unit="cm"
              value={heightDraft}
              onDec={() => setHeightDraft((v) => Math.max(100, v - 1))}
              onInc={() => setHeightDraft((v) => Math.min(250, v + 1))}
            />
            <button
              onClick={saveBody}
              disabled={savingBody}
              style={{
                width: "100%",
                padding: 13,
                borderRadius: 14,
                background: "var(--lime)",
                color: "#10130a",
                font: "800 14px var(--font-archivo), sans-serif",
                opacity: savingBody ? 0.7 : 1,
              }}
            >
              {savingBody ? "Menyimpan…" : "Simpan umur & tinggi"}
            </button>
            <div style={{ font: "500 11.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", textAlign: "center" }}>
              Target kalori & protein harian ikut dihitung ulang otomatis.
            </div>
          </div>
        )}
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
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data.volumeSeries} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <XAxis dataKey="label" tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Bar dataKey="volume" fill="#C9FB3C" radius={[6, 6, 0, 0]} maxBarSize={48}>
                <LabelList
                  dataKey="volume"
                  position="top"
                  formatter={(v) => formatNumber(Number(v))}
                  style={{ fill: "var(--dim)", fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
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

      {/* reset tujuan & progres */}
      <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid rgba(255,107,107,.28)" }}>
        <div style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
          Reset tujuan
        </div>
        <div style={{ font: "500 12.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 4, marginBottom: 14 }}>
          Menghapus semua progres (sesi latihan, catatan gizi, berat, & program)
          lalu memulai lagi dari penentuan tujuan. Tindakan ini tidak bisa dibatalkan.
        </div>

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              width: "100%",
              padding: 13,
              borderRadius: 14,
              background: "rgba(255,107,107,.12)",
              border: "1px solid rgba(255,107,107,.3)",
              color: "#ff6b6b",
              font: "800 14px var(--font-archivo), sans-serif",
            }}
          >
            Reset tujuan & progres
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ font: "700 13px var(--font-archivo), sans-serif", color: "#ff6b6b", textAlign: "center" }}>
              Yakin? Semua progres akan hilang permanen.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 14,
                  background: "var(--raised)",
                  border: "1px solid var(--line2)",
                  color: "var(--ink2)",
                  font: "800 14px var(--font-archivo), sans-serif",
                  opacity: resetting ? 0.6 : 1,
                }}
              >
                Batal
              </button>
              <button
                onClick={reset}
                disabled={resetting}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 14,
                  background: "#ff6b6b",
                  border: "none",
                  color: "#fff",
                  font: "800 14px var(--font-archivo), sans-serif",
                  opacity: resetting ? 0.7 : 1,
                }}
              >
                {resetting ? "Mereset…" : "Ya, reset"}
              </button>
            </div>
          </div>
        )}
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

const SOCIAL_LINKS: {
  label: string;
  handle: string;
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "Instagram",
    handle: "@riky_zulkarnain",
    href: "https://instagram.com/riky_zulkarnain",
    color: "#e1306c",
    bg: "rgba(225,48,108,.14)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    handle: "in/riki-zulkarnain",
    href: "https://www.linkedin.com/in/riki-zulkarnain-073a52166",
    color: "#0a66c2",
    bg: "rgba(10,102,194,.14)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm15.11 13.02h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z" />
      </svg>
    ),
  },
  {
    label: "X",
    handle: "@rikyzul_",
    href: "https://x.com/rikyzul_",
    color: "var(--ink)",
    bg: "var(--raised)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.9 1.5h3.68l-8.04 9.19L24 22.5h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.5h7.6l5.24 6.93L18.9 1.5zm-1.29 18.8h2.04L6.49 3.6H4.3l13.31 16.7z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    handle: "@rikyzulkarnain21",
    href: "https://youtube.com/@rikyzulkarnain21",
    color: "#ff3b30",
    bg: "rgba(255,59,48,.14)",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M22.5 7.2a2.78 2.78 0 0 0-1.96-1.96C18.8 4.75 12 4.75 12 4.75s-6.8 0-8.54.49A2.78 2.78 0 0 0 1.5 7.2 29 29 0 0 0 1 12a29 29 0 0 0 .5 4.8 2.78 2.78 0 0 0 1.96 1.96c1.74.49 8.54.49 8.54.49s6.8 0 8.54-.49a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.8z" />
        <path d="M9.75 15.5v-7l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

function SocialLink({
  label,
  handle,
  href,
  color,
  bg,
  icon,
}: {
  label: string;
  handle: string;
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--line2)",
        textDecoration: "none",
        minWidth: 0,
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          flex: "none",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          color,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "800 12.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>{label}</div>
        <div style={{ font: "500 11px var(--font-jakarta), sans-serif", color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {handle}
        </div>
      </div>
    </a>
  );
}

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

function LevelTargetCard({
  level,
  consistentWeeks,
}: {
  level: ExperienceLevel;
  consistentWeeks: number;
}) {
  const target = nextLevelTarget(level);
  const isMax = target.next === null;
  const pct = isMax
    ? 100
    : Math.min(100, Math.round((consistentWeeks / target.weeksRequired) * 100));
  const remainingWeeks = Math.max(0, target.weeksRequired - consistentWeeks);
  const remainingMonths = Math.max(1, Math.round(remainingWeeks / 4.33));

  return (
    <div style={{ marginTop: 14, borderRadius: 20, padding: 18, background: "var(--surface)", border: "1px solid var(--line2)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ font: "700 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
          {isMax ? "Level maksimal 👑" : `Menuju level ${LEVEL_LABEL[target.next!] ?? target.next}`}
        </span>
        <span style={{ font: "700 12px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
          {LEVEL_LABEL[level] ?? level}
        </span>
      </div>

      {!isMax && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "10px 0 6px" }}>
            <span style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
              {consistentWeeks} / {target.weeksRequired} minggu konsisten
            </span>
            <span style={{ font: "700 12px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: "var(--track)", overflow: "hidden", marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 8, background: "var(--lime)", transition: "width .4s ease" }} />
          </div>
          {remainingWeeks > 0 ? (
            <div style={{ font: "600 12px/1.55 var(--font-jakarta), sans-serif", color: "var(--dim)", marginBottom: 12 }}>
              Minggu dihitung konsisten bila ≥2 sesi selesai. Sisa ±{remainingWeeks} minggu
              (≈{remainingMonths} bulan). Standar pelatih: level naik dari lama tubuh
              beradaptasi — tidak terkait target deadline tujuanmu.
            </div>
          ) : (
            <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--acc)", marginBottom: 12 }}>
              Durasi konsisten tercapai! Pastikan kriteria di bawah juga terpenuhi, lalu
              naikkan level lewat reset tujuan / program berikutnya.
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: isMax ? 10 : 0 }}>
        {target.criteria.map((c) => (
          <div key={c} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: "var(--acc)", fontSize: 12, lineHeight: 1.6 }}>◆</span>
            <span style={{ font: "500 12.5px/1.55 var(--font-jakarta), sans-serif", color: "var(--ink2)" }}>
              {c}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditRow({
  label,
  unit,
  value,
  onDec,
  onInc,
}: {
  label: string;
  unit: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ flex: 1, font: "600 13px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
        {label}
      </span>
      <button onClick={onDec} aria-label={`Kurangi ${label}`} style={editBtn}>−</button>
      <div style={{ minWidth: 74, textAlign: "center" }}>
        <span style={{ font: "900 22px var(--font-archivo), sans-serif", color: "var(--ink)" }}>{value}</span>
        <span style={{ font: "700 12px var(--font-archivo), sans-serif", color: "var(--dim)" }}> {unit}</span>
      </div>
      <button onClick={onInc} aria-label={`Tambah ${label}`} style={editBtn}>+</button>
    </div>
  );
}

const editBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: "var(--raised)",
  border: "1px solid var(--line2)",
  font: "600 20px var(--font-archivo), sans-serif",
  color: "var(--ink2)",
};

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
