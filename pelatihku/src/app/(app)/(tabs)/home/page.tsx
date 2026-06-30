import GreetingText from "@/components/common/greeting-text";
import ThemeToggle from "@/components/common/theme-toggle";
import { getHomeData } from "@/features/home/action";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import StartSessionButton from "./start-session-button";

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0 18px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "600 13px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
            <GreetingText />
          </div>
          <div
            style={{
              font: "800 22px var(--font-archivo), sans-serif",
              color: "var(--ink)",
              whiteSpace: "nowrap",
            }}
          >
            {data.name}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <ThemeToggle />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 14px",
              borderRadius: 14,
              background: "rgba(255,122,60,.12)",
              border: "1px solid rgba(255,122,60,.25)",
            }}
          >
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ font: "800 16px var(--font-archivo), sans-serif", color: "#ff7a3c" }}>
              {data.streak}
            </span>
          </div>
        </div>
      </div>

      {/* today's workout hero */}
      <div
        style={{
          borderRadius: 26,
          padding: 22,
          background: "linear-gradient(150deg,#cdf93f 0%,#9fe119 100%)",
          color: "#10130a",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 18px 40px -18px rgba(201,251,60,.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(255,255,255,.18)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              font: "800 11px var(--font-archivo), sans-serif",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            Latihan hari ini
          </div>
          <h2 style={{ font: "900 26px/1.1 var(--font-archivo), sans-serif", margin: "8px 0 4px" }}>
            {data.today ? data.today.label : "Hari istirahat"}
          </h2>
          {data.today ? (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 9,
                  font: "700 13px var(--font-archivo), sans-serif",
                  opacity: 0.75,
                  marginBottom: 18,
                  whiteSpace: "nowrap",
                }}
              >
                <span>{data.today.focus}</span>
                <span>•</span>
                <span>{data.today.exerciseCount} gerakan</span>
                <span>•</span>
                <span>~{data.today.estMinutes} mnt</span>
              </div>
              <StartSessionButton programId={data.today.programId} dayId={data.today.dayId} />
            </>
          ) : (
            <p style={{ font: "600 14px var(--font-jakarta), sans-serif", marginBottom: 0, opacity: 0.8 }}>
              Pulihkan ototmu. Besok lanjut lebih kuat 💪
            </p>
          )}
        </div>
      </div>

      {/* weekly target */}
      <div
        style={{
          marginTop: 16,
          borderRadius: 20,
          padding: 18,
          background: "var(--surface)",
          border: "1px solid var(--line2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <span style={{ font: "700 15px var(--font-archivo), sans-serif", color: "var(--ink)", whiteSpace: "nowrap" }}>
            Target minggu ini
          </span>
          <span style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
            {data.weekDone} / {data.weekGoal} sesi
          </span>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {data.weekDots.map((d, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "700 12px var(--font-archivo), sans-serif",
                background: d.done ? "var(--lime)" : "var(--track)",
                color: d.done ? "#10130a" : "var(--faint)",
                border: d.today && !d.done ? "1.5px solid var(--acc)" : "none",
              }}
            >
              {d.day}
            </div>
          ))}
        </div>
      </div>

      {/* quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <StatCard label="Total terangkat" value={formatNumber(data.totalVolume)} unit=" kg" />
        <StatCard
          label="Protein hari ini"
          value={String(data.proteinNow)}
          unit={` / ${data.proteinTarget}g`}
        />
      </div>

      {/* shortcuts */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <ShortcutCard
          href="/library"
          title="Pustaka Gerakan"
          subtitle="Teknik & video"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--acc)" }} strokeWidth="2" strokeLinecap="round">
              <path d="M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M6.5 17.5l-4 4M17.5 6.5l4-4" />
            </svg>
          }
        />
        <ShortcutCard
          href="/coach"
          title="AI Coach"
          subtitle="Tanya apa saja"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--acc)" }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1.3-3.1A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ borderRadius: 18, padding: 16, background: "var(--surface)", border: "1px solid var(--line2)" }}>
      <div style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>{label}</div>
      <div style={{ font: "900 24px var(--font-archivo), sans-serif", color: "var(--ink)", marginTop: 4 }}>
        {value}
        <span style={{ fontSize: 14, color: "var(--dim)" }}>{unit}</span>
      </div>
    </div>
  );
}

function ShortcutCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        borderRadius: 18,
        padding: "18px 16px",
        background: "var(--surface)",
        border: "1px solid var(--line2)",
        textAlign: "left",
        textDecoration: "none",
        display: "block",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "rgba(201,251,60,.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div style={{ font: "700 15px var(--font-archivo), sans-serif", color: "var(--ink)" }}>{title}</div>
      <div style={{ font: "500 12px var(--font-jakarta), sans-serif", color: "var(--dim)", marginTop: 2 }}>
        {subtitle}
      </div>
    </Link>
  );
}
