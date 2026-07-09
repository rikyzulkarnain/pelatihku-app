"use client";

import { useMemo } from "react";

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shift(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** "hari ini" / "kemarin" / "8 Jul" */
export function backdateLabel(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return "hari ini";
  if (dateStr === shift(today, -1)) return "kemarin";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${BULAN[m - 1]}`;
}

/**
 * Pemilih tanggal untuk mencatat latihan / nutrisi hari sebelumnya.
 * Chip cepat "Hari ini" & "Kemarin", plus input tanggal untuk hari yang lebih
 * lama (dibatasi maksimal hari ini & mundur `maxDaysBack` hari).
 */
export default function BackdateSelector({
  value,
  onChange,
  maxDaysBack = 30,
}: {
  value: string;
  onChange: (date: string) => void;
  maxDaysBack?: number;
}) {
  const today = useMemo(() => todayStr(), []);
  const yesterday = useMemo(() => shift(today, -1), [today]);
  const minDate = useMemo(() => shift(today, -maxDaysBack), [today, maxDaysBack]);
  const isCustom = value !== today && value !== yesterday;

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 12,
    font: "700 13px var(--font-archivo), sans-serif",
    whiteSpace: "nowrap",
    background: active ? "var(--lime)" : "var(--surface)",
    color: active ? "#10130a" : "var(--dim)",
    border: `1px solid ${active ? "var(--lime)" : "var(--line2)"}`,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button style={chip(value === today)} onClick={() => onChange(today)}>
        Hari ini
      </button>
      <button style={chip(value === yesterday)} onClick={() => onChange(yesterday)}>
        Kemarin
      </button>
      <label
        style={{
          ...chip(isCustom),
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
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
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {isCustom ? backdateLabel(value) : "Tanggal lain"}
        {/* Input transparan menutupi chip: mengetuk di mana pun membuka
            pemilih tanggal bawaan (paling andal lintas browser). */}
        <input
          type="date"
          value={value}
          max={today}
          min={minDate}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Pilih tanggal lain"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </label>
    </div>
  );
}
