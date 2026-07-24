"use client";

import { updateFeedbackStatus } from "@/features/admin/action";
import type { FeedbackStatus } from "@/features/admin/data";
import { useTransition } from "react";
import { toast } from "sonner";

const OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "baru", label: "Baru" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
];

export default function StatusControl({
  id,
  status,
}: {
  id: string;
  status: FeedbackStatus;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(next: FeedbackStatus) {
    if (next === status) return;
    startTransition(async () => {
      const res = await updateFeedbackStatus(id, next);
      if (res.error) toast.error(res.error);
      else toast.success("Status diperbarui.");
    });
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => onChange(e.target.value as FeedbackStatus)}
      aria-label="Ubah status masukan"
      style={{
        padding: "7px 10px",
        borderRadius: 10,
        font: "700 12px var(--font-archivo), sans-serif",
        background: "var(--raised)",
        color: "var(--ink)",
        border: "1px solid var(--line2)",
        outline: "none",
        cursor: "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
