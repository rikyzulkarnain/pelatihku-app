"use client";

import { useRouter } from "next/navigation";
import ThemeToggle from "./theme-toggle";

export default function ScreenHeader({ back }: { back?: string }) {
  const router = useRouter();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0 4px",
      }}
    >
      {back ? (
        <button
          onClick={() => router.push(back)}
          aria-label="Kembali"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "var(--dim)",
          }}
        >
          ‹
        </button>
      ) : (
        <span />
      )}
      <ThemeToggle size={38} />
    </div>
  );
}
