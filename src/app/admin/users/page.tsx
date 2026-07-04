import { GOAL_LABEL, LEVEL_LABEL } from "@/constants/labels";
import { getAdminUsers } from "@/features/admin/data";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div>
      <h1 style={{ font: "900 clamp(22px, 3vw, 28px) var(--font-archivo), sans-serif", color: "var(--ink)", margin: "0 0 4px" }}>
        Pengguna
      </h1>
      <p style={{ font: "500 13px var(--font-jakarta), sans-serif", color: "var(--dim)", margin: "0 0 20px" }}>
        {users.length} akun terdaftar, terbaru di atas.
      </p>

      {/* Di layar sempit tabel bisa digeser horizontal */}
      <div
        style={{
          borderRadius: 20,
          border: "1px solid var(--line2)",
          background: "var(--surface)",
          overflowX: "auto",
        }}
      >
        <div style={{ minWidth: 860 }}>
          {/* header */}
          <div style={{ ...rowStyle, borderTop: "none", background: "var(--raised)" }}>
            <div style={headStyle}>Pengguna</div>
            <div style={headStyle}>Tujuan · Level</div>
            <div style={{ ...headStyle, textAlign: "center" }}>Sesi</div>
            <div style={{ ...headStyle, textAlign: "center" }}>Makan</div>
            <div style={headStyle}>Latihan terakhir</div>
            <div style={headStyle}>Daftar</div>
          </div>

          {users.map((u) => (
            <div key={u.id} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      flex: "none",
                      borderRadius: 9,
                      background: "linear-gradient(150deg,#cdf93f,#9fe119)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "900 13px var(--font-archivo), sans-serif",
                      color: "#10130a",
                    }}
                  >
                    {(u.name[0] ?? "?").toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.name}
                      {!u.onboarded && (
                        <span
                          style={{
                            marginLeft: 6,
                            font: "700 9.5px var(--font-archivo), sans-serif",
                            color: "#ff9a5c",
                            background: "rgba(255,154,92,.12)",
                            border: "1px solid rgba(255,154,92,.3)",
                            borderRadius: 6,
                            padding: "2px 6px",
                            verticalAlign: "middle",
                          }}
                        >
                          belum onboarding
                        </span>
                      )}
                    </div>
                    <div style={{ font: "500 11.5px var(--font-jakarta), sans-serif", color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.email}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--ink2)" }}>
                {u.goal ? (GOAL_LABEL[u.goal] ?? u.goal) : "—"}
                <div style={{ color: "var(--dim)", marginTop: 2 }}>
                  {u.level ? (LEVEL_LABEL[u.level] ?? u.level) : ""}
                </div>
              </div>

              <div style={{ textAlign: "center", font: "800 15px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
                {u.totalSessions}
              </div>
              <div style={{ textAlign: "center", font: "800 15px var(--font-archivo), sans-serif", color: "#7cc4ff" }}>
                {u.mealsLogged}
              </div>

              <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--ink2)" }}>
                {u.lastWorkoutAt
                  ? format(new Date(u.lastWorkoutAt), "d MMM yyyy, HH:mm", { locale: localeId })
                  : "—"}
              </div>
              <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                {format(new Date(u.createdAt), "d MMM yyyy", { locale: localeId })}
                {u.lastSignInAt && (
                  <div style={{ color: "var(--faint)", marginTop: 2 }}>
                    login {format(new Date(u.lastSignInAt), "d MMM, HH:mm", { locale: localeId })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 2.2fr) minmax(150px, 1.6fr) 70px 70px minmax(150px, 1.4fr) minmax(120px, 1.2fr)",
  gap: 12,
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid var(--line2)",
};

const headStyle: React.CSSProperties = {
  font: "800 10.5px var(--font-archivo), sans-serif",
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--dim)",
};
