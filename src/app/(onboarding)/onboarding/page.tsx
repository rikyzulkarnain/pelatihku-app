"use client";

import PhoneShell from "@/components/common/phone-shell";
import { completeOnboarding } from "@/features/onboarding/action";
import {
  ONBOARDING_QUESTIONS,
  OnboardingQuestion,
} from "@/constants/onboarding-constant";
import { OnboardingAnswers } from "@/types/profile";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AnswerMap = Partial<Record<keyof OnboardingAnswers, string | number | string[]>>;

function initialAnswers(): AnswerMap {
  const map: AnswerMap = {};
  for (const q of ONBOARDING_QUESTIONS) {
    if (q.type === "number") map[q.key] = q.default;
    if (q.type === "multichoice") map[q.key] = [];
  }
  return map;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [saving, setSaving] = useState(false);

  const total = ONBOARDING_QUESTIONS.length;
  const q = ONBOARDING_QUESTIONS[index];
  const value = answers[q.key];

  const canNext = useMemo(() => {
    if (q.type === "number") return true;
    if (q.type === "multichoice") return true;
    return value !== undefined && value !== "";
  }, [q, value]);

  function setValue(v: string | number | string[]) {
    setAnswers((prev) => ({ ...prev, [q.key]: v }));
  }

  function back() {
    if (index === 0) router.push("/register");
    else setIndex((i) => i - 1);
  }

  async function next() {
    if (!canNext) return;
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    // Last question -> persist + go to generating.
    setSaving(true);
    const payload = answers as unknown as OnboardingAnswers;
    const res = await completeOnboarding({
      ...payload,
      target_deadline: (answers.target_deadline as string) ?? null,
    });
    if (res.error) {
      setSaving(false);
      toast.error(res.error);
      return;
    }
    router.push("/generating");
  }

  const isLast = index === total - 1;

  return (
    <PhoneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "8px 24px 24px",
          overflowY: "auto",
        }}
        className="no-scrollbar"
      >
        {/* progress header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 0 18px" }}>
          <button
            onClick={back}
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
          <div style={{ flex: 1, height: 6, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 6,
                background: "linear-gradient(90deg,#9fe119,#C9FB3C)",
                width: `${((index + 1) / total) * 100}%`,
                transition: "width .35s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
          <span
            style={{
              font: "700 13px var(--font-archivo), sans-serif",
              color: "var(--dim)",
              minWidth: 38,
              textAlign: "right",
            }}
          >
            {index + 1}/{total}
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          <div key={index} style={{ animation: "pk-up .35s both" }}>
            <div
              style={{
                font: "800 11px var(--font-archivo), sans-serif",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: "var(--acc)",
                marginBottom: 12,
              }}
            >
              {q.kicker}
            </div>
            <h1
              style={{
                font: "800 28px/1.15 var(--font-archivo), sans-serif",
                color: "var(--ink)",
                margin: "0 0 8px",
                letterSpacing: "-.01em",
              }}
            >
              {q.question}
            </h1>
            <p
              style={{
                font: "500 15px/1.4 var(--font-jakarta), sans-serif",
                color: "var(--dim)",
                margin: "0 0 26px",
              }}
            >
              {q.sub}
            </p>
          </div>

          {q.type === "number" && (
            <NumberStepper
              q={q}
              value={value as number}
              onChange={(v) => setValue(v)}
            />
          )}

          {q.type === "choice" && (
            <ChoiceList
              options={q.options}
              selected={value as string}
              onSelect={(v) => setValue(v)}
            />
          )}

          {q.type === "multichoice" && (
            <MultiChoiceList
              options={q.options}
              selected={(value as string[]) ?? []}
              onToggle={(v) => {
                const cur = (value as string[]) ?? [];
                setValue(
                  cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
                );
              }}
            />
          )}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        <button
          onClick={next}
          disabled={!canNext || saving}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 18,
            background: "var(--lime)",
            color: "#10130a",
            font: "800 17px var(--font-archivo), sans-serif",
            letterSpacing: ".01em",
            boxShadow: "0 12px 30px -10px rgba(201,251,60,.5)",
            opacity: !canNext || saving ? 0.55 : 1,
          }}
        >
          {saving ? "Menyimpan…" : isLast ? "Selesai & susun program" : "Lanjut"}
        </button>
      </div>
    </PhoneShell>
  );
}

function NumberStepper({
  q,
  value,
  onChange,
}: {
  q: Extract<OnboardingQuestion, { type: "number" }>;
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(q.min, Math.min(q.max, v));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        animation: "pk-up .4s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <span style={{ font: "900 78px/1 var(--font-archivo), sans-serif", color: "var(--ink)" }}>
          {value}
        </span>
        <span style={{ font: "700 22px var(--font-archivo), sans-serif", color: "var(--acc)", marginBottom: 14 }}>
          {q.unit}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 22 }}>
        <StepBtn label="−" onClick={() => onChange(clamp(value - q.step))} />
        <StepBtn label="+" onClick={() => onChange(clamp(value + q.step))} />
      </div>
    </div>
  );
}

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: "var(--surface)",
        border: "1.5px solid var(--line)",
        font: "600 30px var(--font-archivo), sans-serif",
        color: "var(--ink2)",
      }}
    >
      {label}
    </button>
  );
}

function ChoiceList({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            style={chipStyle(active)}
          >
            <span style={dotStyle(active)}>{active ? "✓" : ""}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceList({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={chipStyle(active)}
          >
            <span style={dotStyle(active)}>{active ? "✓" : ""}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: "16px 18px",
    borderRadius: 16,
    background: active ? "rgba(201,251,60,.08)" : "var(--surface)",
    border: active ? "1.5px solid var(--acc)" : "1px solid var(--line)",
    color: "var(--ink)",
    font: "700 15px var(--font-archivo), sans-serif",
  };
}

function dotStyle(active: boolean): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: "50%",
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? "var(--lime)" : "transparent",
    border: active ? "none" : "2px solid var(--line)",
    color: "#10130a",
    fontSize: 13,
    fontWeight: 800,
  };
}
