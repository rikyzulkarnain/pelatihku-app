"use client";

import { InputHTMLAttributes, useState } from "react";

export default function PkInput({
  label,
  password,
  ...props
}: {
  label?: string;
  password?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <label
          style={{
            font: "700 11px var(--font-archivo), sans-serif",
            color: "var(--dim)",
            display: "block",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          {...props}
          type={password ? (show ? "text" : "password") : props.type}
          style={{
            width: "100%",
            padding: password ? "15px 48px 15px 16px" : "15px 16px",
            borderRadius: 14,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            font: "500 15px var(--font-jakarta), sans-serif",
            outline: "none",
          }}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Sembunyikan sandi" : "Tampilkan sandi"}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--dim)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
