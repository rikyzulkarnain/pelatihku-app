"use client";

import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/constants/labels";
import { Exercise } from "@/types/program";
import { CSSProperties, useRef, useState, type TouchEvent } from "react";

/** Ubah URL YouTube (watch / youtu.be / playlist / shorts) ke bentuk embed. Return null jika bukan YouTube. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        const list = u.searchParams.get("list");
        if (id) return `https://www.youtube.com/embed/${id}${list ? `?list=${list}` : ""}`;
      }
      if (u.pathname === "/playlist") {
        const list = u.searchParams.get("list");
        if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
      }
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Apakah URL menunjuk ke file video langsung (.mp4/.webm/.ogg/.mov). */
export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function ExerciseVideo({ url }: { url: string | null }) {
  const box: CSSProperties = {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    background: "linear-gradient(150deg,var(--raised),var(--surface))",
  };

  if (!url) {
    return (
      <div
        style={{
          ...box,
          height: 170,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(201,251,60,.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pk-pulse 2s ease-in-out infinite",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" style={{ fill: "var(--acc)" }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span style={{ font: "600 12px var(--font-jakarta), sans-serif", color: "var(--dim)" }}>
          Video teknik (belum tersedia)
        </span>
      </div>
    );
  }

  const embed = youtubeEmbedUrl(url);
  if (embed) {
    return (
      <div style={{ ...box, position: "relative", aspectRatio: "16 / 9" }}>
        <iframe
          src={embed}
          title="Video teknik"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
    );
  }

  if (isDirectVideo(url)) {
    return (
      <div style={{ ...box, aspectRatio: "16 / 9" }}>
        <video src={url} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  // URL non-YouTube (mis. halaman trainest/darebee) — situs ini biasanya memblok iframe,
  // jadi tampilkan tombol untuk membuka di tab baru.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...box,
        height: 170,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(201,251,60,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" style={{ fill: "var(--acc)" }}>
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <span style={{ font: "700 13px var(--font-archivo), sans-serif", color: "var(--acc)" }}>
        Buka video teknik ↗
      </span>
    </a>
  );
}

export function ExerciseSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    // Mulai gestur tutup hanya kalau konten sudah di paling atas.
    startY.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  }
  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(dy > 0 ? dy : 0);
  }
  function onTouchEnd() {
    // Tarik ke bawah cukup jauh → tutup.
    if (dragY > 110) onClose();
    else setDragY(0);
    startY.current = null;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 85,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        ref={scrollRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "88%",
          overflowY: "auto",
          background: "var(--sheet)",
          borderRadius: "28px 28px 0 0",
          borderTop: "1px solid rgba(201,251,60,.18)",
          padding: "10px 22px 30px",
          animation: dragY === 0 ? "pk-up .3s both" : undefined,
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : "transform .3s ease",
          touchAction: "pan-y",
        }}
        className="no-scrollbar"
      >
        {/* tombol tutup */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            zIndex: 2,
            width: 34,
            height: 34,
            borderRadius: 11,
            background: "var(--surface)",
            border: "1px solid var(--line2)",
            color: "var(--dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* handle: tarik ke bawah untuk menutup */}
        <div style={{ width: 42, height: 5, borderRadius: 5, background: "var(--raised2)", margin: "6px auto 4px" }} />
        <div style={{ textAlign: "center", font: "600 10.5px var(--font-jakarta), sans-serif", color: "var(--faint)", marginBottom: 14 }}>
          Geser ke bawah untuk menutup
        </div>
        <ExerciseVideo url={exercise.video_url} />

        <h2 style={{ font: "900 24px var(--font-archivo), sans-serif", color: "var(--ink)", margin: "0 0 6px" }}>
          {exercise.name}
        </h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ font: "600 12px var(--font-archivo), sans-serif", color: "var(--acc)", padding: "5px 11px", borderRadius: 9, background: "rgba(201,251,60,.1)" }}>
            {MUSCLE_LABEL[exercise.muscle_group] ?? exercise.muscle_group}
          </span>
          <span style={{ font: "600 12px var(--font-archivo), sans-serif", color: "var(--dim)", padding: "5px 11px", borderRadius: 9, background: "var(--raised)" }}>
            {EQUIPMENT_LABEL[exercise.equipment] ?? exercise.equipment}
          </span>
        </div>

        <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 12 }}>
          Cara melakukan
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
          {exercise.technique_steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--lime)",
                  color: "#10130a",
                  font: "800 13px var(--font-archivo), sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                {i + 1}
              </div>
              <div style={{ font: "500 14px/1.5 var(--font-jakarta), sans-serif", color: "var(--ink2)", paddingTop: 2 }}>
                {step}
              </div>
            </div>
          ))}
        </div>

        {exercise.injury_cautions.length > 0 && (
          <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,122,60,.08)", border: "1px solid rgba(255,122,60,.18)" }}>
            <div style={{ font: "800 11px var(--font-archivo), sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#ff9a5c", marginBottom: 6 }}>
              ⚠ Hindari cedera
            </div>
            <div style={{ font: "500 13px/1.5 var(--font-jakarta), sans-serif", color: "var(--ink2)" }}>
              Hati-hati jika punya keluhan pada{" "}
              {exercise.injury_cautions
                .map((c) => c.replace(/_/g, " "))
                .join(", ")}
              . Jaga teknik, mulai dari beban ringan, dan hentikan bila terasa nyeri tajam.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
