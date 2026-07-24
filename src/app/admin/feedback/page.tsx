import { getAdminFeedback } from "@/features/admin/data";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import StatusControl from "./_components/status-control";

export const dynamic = "force-dynamic";

const TYPE_META = {
  saran: { icon: "💡", label: "Saran", color: "rgba(201,251,60,.14)", ink: "var(--acc)" },
  bug: { icon: "🐞", label: "Bug", color: "rgba(255,107,107,.14)", ink: "#ff6b6b" },
  lainnya: { icon: "💬", label: "Lainnya", color: "rgba(124,196,255,.14)", ink: "#7cc4ff" },
} as const;

const STATUS_META = {
  baru: { label: "Baru", color: "#ff9a5c", bg: "rgba(255,154,92,.12)" },
  diproses: { label: "Diproses", color: "#7cc4ff", bg: "rgba(124,196,255,.12)" },
  selesai: { label: "Selesai", color: "var(--acc)", bg: "rgba(201,251,60,.12)" },
} as const;

export default async function AdminFeedbackPage() {
  const items = await getAdminFeedback();

  const count = (fn: (i: (typeof items)[number]) => boolean) => items.filter(fn).length;
  const newCount = count((i) => i.status === "baru");
  const bugCount = count((i) => i.type === "bug");
  const saranCount = count((i) => i.type === "saran");

  return (
    <div>
      <h1 style={{ font: "900 clamp(22px, 3vw, 28px) var(--font-archivo), sans-serif", color: "var(--ink)", margin: "0 0 4px" }}>
        Masukan Pengguna
      </h1>
      <p style={{ font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)", margin: "0 0 20px" }}>
        Saran & laporan bug dari pengguna, terbaru di atas.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
        <StatCard label="Total masukan" value={String(items.length)} />
        <StatCard label="Belum diproses" value={String(newCount)} accent />
        <StatCard label="Laporan bug" value={String(bugCount)} />
        <StatCard label="Saran fitur" value={String(saranCount)} />
      </div>

      {items.length === 0 ? (
        <div
          style={{
            borderRadius: 20,
            border: "1px solid var(--line2)",
            background: "var(--surface)",
            padding: "40px 20px",
            textAlign: "center",
            font: "500 13px var(--font-jakarta), sans-serif",
            color: "var(--dim)",
          }}
        >
          Belum ada masukan.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((f) => {
            const t = TYPE_META[f.type];
            const s = STATUS_META[f.status];
            return (
              <div
                key={f.id}
                style={{
                  borderRadius: 18,
                  border: "1px solid var(--line2)",
                  background: "var(--surface)",
                  padding: "clamp(14px, 2.4vw, 18px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: t.color,
                      color: t.ink,
                      font: "800 11.5px var(--font-archivo), sans-serif",
                    }}
                  >
                    {t.icon} {t.label}
                  </span>
                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: s.bg,
                      color: s.color,
                      font: "800 11px var(--font-archivo), sans-serif",
                    }}
                  >
                    {s.label}
                  </span>
                  {f.page && (
                    <span style={{ font: "600 11px var(--font-jakarta), sans-serif", color: "var(--faint)" }}>
                      dari {f.page}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", font: "600 11.5px var(--font-jakarta), sans-serif", color: "var(--faint)" }}>
                    {format(new Date(f.createdAt), "d MMM yyyy · HH:mm", { locale: localeId })}
                  </span>
                </div>

                <p style={{ font: "500 14px/1.55 var(--font-jakarta), sans-serif", color: "var(--ink2)", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
                  {f.message}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "700 12.5px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                      {f.userName}
                    </div>
                    <div style={{ font: "500 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                      {f.userEmail}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <StatusControl id={f.id} status={f.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "16px 16px 14px",
        background: "var(--surface)",
        border: `1px solid ${accent ? "rgba(201,251,60,.3)" : "var(--line2)"}`,
      }}
    >
      <div style={{ font: "600 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>{label}</div>
      <div
        style={{
          font: "900 clamp(22px, 2.6vw, 28px) var(--font-archivo), sans-serif",
          color: accent ? "var(--acc)" : "var(--ink)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
