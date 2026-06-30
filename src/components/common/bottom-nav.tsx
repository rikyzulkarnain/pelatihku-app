"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

type Tab = { href: string; label: string; icon: ReactNode };

const TABS: Tab[] = [
  {
    href: "/home",
    label: "Beranda",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/program",
    label: "Latihan",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5l11 11M3 4l1 1M20 21l1-1M6 17l-2.5 2.5M18 7l2.5-2.5" />
        <rect x="2" y="9" width="4" height="6" rx="1.4" transform="rotate(-45 4 12)" />
      </svg>
    ),
  },
  {
    href: "/nutrition",
    label: "Nutrisi",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 7c-1.5-2.5-5-3-7-1-2.5 2.5-1 7 1.5 9.5C8 17 10.5 20 12 21c1.5-1 4-4 5.5-5.5C20 13 21.5 8.5 19 6c-2-2-5.5-1.5-7 1z" />
        <path d="M12 7V4M12 4c0-1 1-2 2.5-2" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progres",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-6 4 4 7-8" />
        <path d="M16 7h5v5" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 88,
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderTop: "1px solid var(--line2)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-around",
        padding: "12px 14px 0",
        zIndex: 70,
      }}
    >
      <NavButton tab={TABS[0]} active={isActive(TABS[0].href)} onClick={() => router.push(TABS[0].href)} />
      <NavButton tab={TABS[1]} active={isActive(TABS[1].href)} onClick={() => router.push(TABS[1].href)} />

      {/* Center elevated Coach button */}
      <button
        onClick={() => router.push("/coach")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          flex: 1,
          marginTop: -14,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: "linear-gradient(150deg,#cdf93f,#9fe119)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 22px -6px rgba(201,251,60,.6)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10130a" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1.3-3.1A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
          </svg>
        </div>
        <span
          style={{
            font: "700 10px var(--font-archivo), sans-serif",
            color: isActive("/coach") ? "var(--acc)" : "var(--dim)",
          }}
        >
          Coach
        </span>
      </button>

      <NavButton tab={TABS[2]} active={isActive(TABS[2].href)} onClick={() => router.push(TABS[2].href)} />
      <NavButton tab={TABS[3]} active={isActive(TABS[3].href)} onClick={() => router.push(TABS[3].href)} />
    </div>
  );
}

function NavButton({
  tab,
  active,
  onClick,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        flex: 1,
        color: active ? "var(--acc)" : "var(--dim)",
      }}
    >
      {tab.icon}
      <span style={{ font: "700 10px var(--font-archivo), sans-serif" }}>
        {tab.label}
      </span>
    </button>
  );
}
