import { getAdminUser } from "@/features/admin/guard";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin — Pelatihku" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware sudah memaksa login; di sini pastikan emailnya admin.
  const admin = await getAdminUser();
  if (!admin) redirect("/home");

  return (
    <div style={{ minHeight: "100dvh", background: "var(--phone-bg, #0b0d07)" }}>
      {/* header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--surface)",
          borderBottom: "1px solid var(--line2)",
          padding: "0 clamp(16px, 4vw, 32px)",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            padding: "12px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(150deg,#cdf93f,#9fe119)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ font: "900 15px var(--font-archivo), sans-serif", color: "var(--ink)" }}>
                Pelatihku Admin
              </div>
              <div style={{ font: "600 10.5px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
                {admin.email}
              </div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NavLink href="/admin" label="Dashboard" />
            <NavLink href="/admin/users" label="Pengguna" />
            <NavLink href="/admin/feedback" label="Masukan" />
            <NavLink href="/home" label="← Aplikasi" muted />
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(16px, 3vw, 28px) clamp(16px, 4vw, 32px) 60px" }}>
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, label, muted }: { href: string; label: string; muted?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: "8px 14px",
        borderRadius: 11,
        background: muted ? "transparent" : "var(--raised)",
        border: "1px solid var(--line2)",
        color: muted ? "var(--dim)" : "var(--ink)",
        font: "700 12.5px var(--font-archivo), sans-serif",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}
