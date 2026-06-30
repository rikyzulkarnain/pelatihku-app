"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

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
        background: "var(--phone-bg)",
        display: "flex",
        justifyContent: "center",
        fontFamily: "var(--font-jakarta), sans-serif",
      }}
    >
      <div
        className="pk-phone"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          minHeight: "100dvh",
          background: "var(--phone-bg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "env(safe-area-inset-top, 0px)",
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
