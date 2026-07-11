"use client";

import { backdateLabel } from "@/components/common/backdate-selector";
import {
  AutoGenerateChange,
  autoGenerateExercises,
} from "@/features/program/auto-generate";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ApplyMode = "today" | "permanent";
type EquipMode = "mixed" | "bodyweight";

// Kartu "Generate Latihan Otomatis" DI DALAM sesi: AI menyusun ulang latihan
// hari program INI saja (hari lain tidak disentuh) berdasarkan track record +
// kaidah pelatih. Sebelum mengganti ada konfirmasi + pilihan terapkan
// (tanggal sesi ini saja / permanen) dan pilihan alat (campur / tanpa alat).
export default function AutoGenerateCard({
  programDayId,
  date,
  dayLabel,
}: {
  programDayId: string;
  date: string;
  dayLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apply, setApply] = useState<ApplyMode>("today");
  const [equip, setEquip] = useState<EquipMode>("mixed");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    changes: AutoGenerateChange[];
  } | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    const res = await autoGenerateExercises({
      programDayId,
      date,
      apply,
      equipmentMode: equip,
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const changes = res.changes ?? [];
    setResult({ summary: res.summary ?? "", changes });
    toast.success(
      changes.length === 0
        ? "Latihan sesi ini sudah optimal — tidak ada yang perlu diganti."
        : apply === "permanent"
          ? `${changes.length} latihan hari ini diganti permanen.`
          : `${changes.length} latihan diganti untuk ${backdateLabel(date)} saja.`,
    );
    router.refresh();
  }

  const pill = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "9px 10px",
    borderRadius: 11,
    font: "700 12px var(--font-archivo), sans-serif",
    textAlign: "center",
    background: active ? "var(--lime)" : "var(--raised)",
    color: active ? "#10130a" : "var(--dim)",
    border: `1px solid ${active ? "var(--lime)" : "var(--line2)"}`,
  });

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 14,
        background: "linear-gradient(150deg, rgba(201,251,60,.08), var(--surface))",
        border: "1px solid rgba(201,251,60,.22)",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "800 14px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
            ⚡ Generate Latihan Otomatis
          </div>
          <div style={{ font: "500 12px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 3 }}>
            AI menyusun ulang latihan sesi <b>{dayLabel}</b> ini dari track record &
            kaidah pelatih — bisa di-generate ulang kapan pun.
          </div>
        </div>
        <button
          onClick={() => {
            setOpen((v) => !v);
            setResult(null);
          }}
          style={{
            flex: "none",
            padding: "9px 14px",
            borderRadius: 12,
            background: open ? "var(--raised)" : "var(--lime)",
            color: open ? "var(--dim)" : "#10130a",
            border: `1px solid ${open ? "var(--line2)" : "var(--lime)"}`,
            font: "800 12.5px var(--font-archivo), sans-serif",
          }}
        >
          {open ? "Tutup" : "Generate"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 13, borderTop: "1px solid var(--line2)", paddingTop: 12 }}>
          <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 7 }}>
            Pilihan alat
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button style={pill(equip === "mixed")} onClick={() => setEquip("mixed")}>
              Campur alat & mesin
            </button>
            <button style={pill(equip === "bodyweight")} onClick={() => setEquip("bodyweight")}>
              Tanpa alat semua
            </button>
          </div>

          <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 7 }}>
            Terapkan
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button style={pill(apply === "today")} onClick={() => setApply("today")}>
              {backdateLabel(date) === "hari ini" ? "Hari ini saja" : `${backdateLabel(date)} saja`}
            </button>
            <button style={pill(apply === "permanent")} onClick={() => setApply("permanent")}>
              Permanen
            </button>
          </div>

          {/* Konfirmasi sebelum mengganti. */}
          <div
            style={{
              borderRadius: 13,
              padding: "11px 13px",
              background: "rgba(255,154,92,.08)",
              border: "1px solid rgba(255,154,92,.24)",
              font: "500 12.5px/1.55 var(--font-jakarta), sans-serif",
              color: "#ff9a5c",
              marginBottom: 12,
            }}
          >
            {apply === "permanent" ? (
              <>
                <b>Latihan sesi {dayLabel} akan diganti permanen</b> — hari program
                ini berubah selamanya (hari lain tidak disentuh; kamu tetap bisa
                generate ulang nanti).
              </>
            ) : (
              <>
                <b>Latihan sesi ini akan diganti untuk {backdateLabel(date)} saja</b>{" "}
                — setelahnya kembali ke program asli, dan penggantian tercatat di
                riwayat.
              </>
            )}
          </div>

          <button
            onClick={run}
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 14px",
              borderRadius: 13,
              background: "var(--lime)",
              color: "#10130a",
              font: "800 14px var(--font-archivo), sans-serif",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "AI mempelajari track record & menyusun latihan…" : "Ya, ganti latihan sesi ini"}
          </button>

          {result && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {result.summary && (
                <div style={{ font: "500 12.5px/1.55 var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                  {result.summary}
                </div>
              )}
              {result.changes.length === 0 ? (
                <div style={{ font: "600 12.5px var(--font-jakarta), sans-serif", color: "var(--acc)" }}>
                  Tidak ada yang perlu diganti — susunan sekarang sudah pas.
                </div>
              ) : (
                result.changes.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 12,
                      padding: "9px 12px",
                      background: "var(--raised)",
                      border: "1px solid var(--line2)",
                    }}
                  >
                    <div style={{ font: "600 12.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--ink)" }}>
                      <s style={{ color: "var(--faint)" }}>{c.from}</s> → {c.to}
                    </div>
                    {c.reason && (
                      <div style={{ font: "500 11.5px/1.5 var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
                        {c.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
