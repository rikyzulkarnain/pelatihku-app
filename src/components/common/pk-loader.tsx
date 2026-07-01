import PkLogoMark from "./pk-logo-mark";

/** Indikator loading bermerk (logo + spinner) untuk transisi halaman. */
export default function PkLoader({ label = "Memuat…" }: { label?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <PkLogoMark size={72} />
      <div className="pk-spinner" />
      <div style={{ font: "600 13px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
        {label}
      </div>
    </div>
  );
}
