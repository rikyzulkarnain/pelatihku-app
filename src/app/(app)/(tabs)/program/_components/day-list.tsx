"use client";

import BackdateSelector, {
  backdateLabel,
} from "@/components/common/backdate-selector";
import { useState } from "react";
import DayCard from "./day-card";

type Day = { id: string; num: number; name: string; meta: string };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DayList({
  programId,
  days,
}: {
  programId: string;
  days: Day[];
}) {
  const [date, setDate] = useState(todayStr);
  const backdate = date !== todayStr();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "2px 0 2px",
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
          Catat untuk tanggal
        </span>
        <BackdateSelector value={date} onChange={setDate} />
      </div>

      {backdate && (
        <div
          style={{
            borderRadius: 14,
            padding: "11px 14px",
            background: "rgba(255,154,92,.1)",
            border: "1px solid rgba(255,154,92,.26)",
            font: "600 12.5px/1.5 var(--font-jakarta), sans-serif",
            color: "#ff9a5c",
          }}
        >
          Mencatat latihan yang kelewat untuk <b>{backdateLabel(date)}</b>. Pilih
          hari program di bawah, isi setnya, lalu selesaikan seperti biasa —
          catatannya masuk ke tanggal itu.
        </div>
      )}

      {days.map((d) => (
        <DayCard
          key={d.id}
          programId={programId}
          dayId={d.id}
          num={d.num}
          name={d.name}
          meta={d.meta}
          sessionDate={backdate ? date : undefined}
        />
      ))}
    </div>
  );
}
