export default function StatusBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 26px",
        zIndex: 60,
        color: "var(--ink)",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      <span style={{ fontFamily: "var(--font-archivo), sans-serif" }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="7" width="3" height="5" rx="1" />
          <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" />
          <rect x="9" y="2" width="3" height="10" rx="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 2.5c2 0 3.8.8 5.1 2.1M8 6c1.2 0 2.3.5 3.1 1.3M3 4.6C4.3 3.3 6.1 2.5 8 2.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="8" cy="10" r="1.2" fill="currentColor" />
        </svg>
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
          <rect
            x="1"
            y="1"
            width="21"
            height="11"
            rx="3"
            stroke="currentColor"
            strokeOpacity=".5"
            strokeWidth="1.2"
          />
          <rect x="3" y="3" width="16" height="7" rx="1.5" style={{ fill: "var(--acc)" }} />
          <rect
            x="23.5"
            y="4.5"
            width="1.6"
            height="4"
            rx="1"
            fill="currentColor"
            fillOpacity=".6"
          />
        </svg>
      </div>
    </div>
  );
}
