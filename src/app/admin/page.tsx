import { getAdminDashboard } from "@/features/admin/data";
import { formatNumber } from "@/lib/utils";
import { formatShortDateTimeWIB } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const ACTIVITY_ICON = { session: "🏋️", meal: "🍚", signup: "✨" } as const;
const ACTIVITY_COLOR = {
  session: "rgba(201,251,60,.12)",
  meal: "rgba(124,196,255,.12)",
  signup: "rgba(255,154,92,.12)",
} as const;

export default async function AdminDashboardPage() {
  const { stats, activity } = await getAdminDashboard();

  return (
    <div>
      <h1 style={{ font: "900 clamp(22px, 3vw, 28px) var(--font-archivo), sans-serif", color: "var(--ink)", margin: "0 0 4px" }}>
        Dashboard
      </h1>
      <p style={{ font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)", margin: "0 0 20px" }}>
        Ringkasan aktivitas seluruh pengguna Pelatihku.
      </p>

      {/* statistik — grid responsif tanpa media query */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard label="Total pengguna" value={formatNumber(stats.totalUsers)} accent />
        <StatCard label="Daftar 7 hari terakhir" value={`+${stats.newUsers7d}`} />
        <StatCard label="Aktif hari ini" value={formatNumber(stats.activeToday)} accent />
        <StatCard label="Sesi latihan hari ini" value={formatNumber(stats.sessionsToday)} />
        <StatCard label="Total sesi latihan" value={formatNumber(stats.sessionsTotal)} />
        <StatCard label="Catatan makan hari ini" value={formatNumber(stats.mealsToday)} />
      </div>

      {/* feed aktivitas */}
      <div
        style={{
          marginTop: 22,
          borderRadius: 20,
          background: "var(--surface)",
          border: "1px solid var(--line2)",
          padding: "clamp(14px, 2.5vw, 22px)",
        }}
      >
        <div style={{ font: "800 15px var(--font-archivo), sans-serif", color: "var(--ink)", marginBottom: 14 }}>
          Aktivitas terbaru
        </div>
        {activity.length === 0 ? (
          <div style={{ font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)", padding: "20px 0", textAlign: "center" }}>
            Belum ada aktivitas.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activity.map((a, i) => (
              <div
                key={`${a.at}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--line2)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flex: "none",
                    borderRadius: 12,
                    background: ACTIVITY_COLOR[a.type],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 17,
                  }}
                >
                  {ACTIVITY_ICON[a.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      font: "700 13.5px var(--font-archivo), sans-serif",
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.userName}{" "}
                    <span style={{ fontWeight: 600, color: "var(--ink2)" }}>· {a.title}</span>
                  </div>
                  <div
                    style={{
                      font: "500 12px var(--font-jakarta), sans-serif",
                      color: "var(--dim)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.detail}
                  </div>
                </div>
                <div
                  style={{
                    flex: "none",
                    font: "600 11.5px var(--font-jakarta), sans-serif",
                    color: "var(--faint)",
                    textAlign: "right",
                  }}
                >
                  {formatShortDateTimeWIB(a.at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
