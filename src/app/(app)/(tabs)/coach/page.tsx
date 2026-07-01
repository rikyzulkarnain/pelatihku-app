import { getOrCreateConversation } from "@/features/coach/action";
import CoachView from "./_components/coach-view";

export default async function CoachPage() {
  const init = await getOrCreateConversation();

  if (!init) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ font: "600 15px var(--font-jakarta), sans-serif", color: "var(--dim)", textAlign: "center" }}>
          Tidak dapat memuat coach. Silakan masuk lagi.
        </p>
      </div>
    );
  }

  return <CoachView init={init} />;
}
