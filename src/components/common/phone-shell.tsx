"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";
import StatusBar from "./status-bar";

export default function PhoneShell({
  children,
  nav,
}: {
  children: ReactNode;
  nav?: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <div
      className={cn("pk-app", isLight && "light")}
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "var(--page)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-jakarta), sans-serif",
      }}
    >
      <div
        className="pk-phone"
        style={{
          position: "relative",
          width: 390,
          height: 844,
          maxWidth: "100%",
          maxHeight: "100dvh",
          borderRadius: 46,
          background: "var(--phone-bg)",
          boxShadow:
            "0 0 0 11px var(--bezel1), 0 0 0 13px var(--bezel2), 0 40px 90px -20px rgba(0,0,0,.8), 0 0 120px -30px rgba(201,251,60,.25)",
          overflow: "hidden",
        }}
      >
        <StatusBar />
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            bottom: 0,
            color: "var(--ink2)",
          }}
        >
          {children}
        </div>
        {nav}
      </div>
    </div>
  );
}
