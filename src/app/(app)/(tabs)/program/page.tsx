import { getActiveProgram, getProgressionStatus } from "@/features/program/action";
import AutoGenerateCard from "./_components/auto-generate-card";
import DayList from "./_components/day-list";
import ProgressionCard from "./_components/progression-card";

export default async function ProgramPage() {
  const [program, progression] = await Promise.all([
    getActiveProgram(),
    getProgressionStatus(),
  ]);

  if (!program) {
    return (
      <div style={{ position: "absolute", inset: 0, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ font: "600 15px var(--font-jakarta), sans-serif", color: "var(--dim)", textAlign: "center" }}>
          Belum ada program. Selesaikan onboarding untuk menyusun program.
        </p>
      </div>
    );
  }

  const desc = `${program.frequency_per_week} hari/minggu · ${program.rep_low}-${program.rep_high} rep · ${program.set_low}-${program.set_high} set`;

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      <div style={{ padding: "8px 0 6px" }}>
        <div
          style={{
            font: "800 11px var(--font-archivo), sans-serif",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "var(--acc)",
          }}
        >
          Program kamu
        </div>
        <h1 style={{ font: "900 26px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "6px 0 2px" }}>
          {program.name}
        </h1>
        <p style={{ font: "500 14px var(--font-jakarta), sans-serif", color: "var(--dim)", margin: 0 }}>
          {desc}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        {/* AI menyusun ulang semua latihan (track record + kaidah pelatih). */}
        <AutoGenerateCard />

        {/* Disclaimer medis untuk program persiapan kehamilan (ACOG). */}
        {program.goal === "kesuburan" && (
          <div
            style={{
              borderRadius: 16,
              padding: "13px 15px",
              background: "rgba(255,154,92,.08)",
              border: "1px solid rgba(255,154,92,.24)",
              font: "500 12.5px/1.55 var(--font-jakarta), sans-serif",
              color: "#ff9a5c",
            }}
          >
            Program ini disusun untuk persiapan kehamilan (intensitas moderat,
            tanpa gerakan berisiko). Tetap <b>konsultasikan ke dokter/ob-gyn</b>{" "}
            sebelum memulai, terutama bila ada kondisi medis — dan hentikan bila
            muncul pusing, nyeri, atau perdarahan.
          </div>
        )}

        {/* Target aktivitas mingguan WHO: 150-300 menit kardio intensitas sedang. */}
        {program.includes_cardio && (
          <div
            style={{
              borderRadius: 16,
              padding: "13px 15px",
              background: "rgba(201,251,60,.06)",
              border: "1px solid rgba(201,251,60,.18)",
              font: "500 12.5px/1.55 var(--font-jakarta), sans-serif",
              color: "var(--dim)",
            }}
          >
            Kardio penutup di tiap sesi adalah bagian dari target WHO{" "}
            <b style={{ color: "var(--ink)" }}>150–300 menit/minggu</b> intensitas
            sedang. Tambah jalan cepat santai di hari istirahat untuk menutup
            sisanya.
          </div>
        )}

        {progression?.decision.action === "promote" && (
          <ProgressionCard
            nextLevel={progression.decision.next_level}
            reason={progression.decision.reason}
          />
        )}

        <DayList
          programId={program.id}
          days={program.days.map((d) => ({
            id: d.id,
            num: d.day_index,
            name: d.label,
            meta: `${d.focus ?? ""} · ${d.exercises.length} gerakan`,
          }))}
        />

        <div
          style={{
            borderRadius: 16,
            padding: "14px 16px",
            background: "rgba(201,251,60,.06)",
            border: "1px dashed rgba(201,251,60,.2)",
            font: "500 12.5px/1.5 var(--font-jakarta), sans-serif",
            color: "var(--dim)",
            marginTop: 4,
          }}
        >
          Sisanya hari istirahat. Program menyesuaikan otomatis tiap 4–6 minggu seiring
          kamu makin kuat.
          {progression?.decision.action === "wait" && (
            <> {progression.decision.reason}</>
          )}
        </div>
      </div>
    </div>
  );
}
