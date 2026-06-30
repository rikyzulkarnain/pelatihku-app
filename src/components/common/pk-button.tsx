"use client";

import { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

const base: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "var(--font-archivo), sans-serif",
};

const variants: Record<Variant, CSSProperties> = {
  primary: {
    padding: 17,
    borderRadius: 16,
    background: "var(--lime)",
    color: "#10130a",
    fontWeight: 800,
    fontSize: 16,
    boxShadow: "0 12px 30px -10px rgba(201,251,60,.45)",
  },
  outline: {
    padding: 17,
    borderRadius: 16,
    background: "transparent",
    border: "1.5px solid var(--line)",
    color: "var(--ink)",
    fontWeight: 800,
    fontSize: 16,
  },
  ghost: {
    padding: 8,
    color: "var(--dim)",
    fontWeight: 600,
    fontSize: 13,
    fontFamily: "var(--font-jakarta), sans-serif",
  },
};

export default function PkButton({
  variant = "primary",
  children,
  loading,
  style,
  disabled,
  ...props
}: {
  variant?: Variant;
  children: ReactNode;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...base,
        ...variants[variant],
        opacity: disabled || loading ? 0.6 : 1,
        ...style,
      }}
    >
      {loading ? (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "2.5px solid rgba(16,19,10,.3)",
            borderTopColor: variant === "primary" ? "#10130a" : "var(--acc)",
            animation: "pk-spin .8s linear infinite",
            display: "inline-block",
          }}
        />
      ) : (
        children
      )}
    </button>
  );
}
