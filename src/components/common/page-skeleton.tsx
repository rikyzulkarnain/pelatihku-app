/**
 * Instant placeholder rendered by each route's `loading.tsx` while its server
 * component fetches data. Keeps the phone shell + bottom nav in place so tab
 * switches feel immediate instead of blocking on the network.
 */
export default function PageSkeleton() {
  return (
    <div
      style={{ position: "absolute", inset: 0, padding: "20px 20px 120px", overflow: "hidden" }}
      className="no-scrollbar"
    >
      <div className="pk-skel" style={{ height: 26, width: "50%", borderRadius: 10, marginBottom: 22 }} />
      <div className="pk-skel" style={{ height: 150, borderRadius: 26, marginBottom: 16 }} />
      <div className="pk-skel" style={{ height: 92, borderRadius: 20, marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="pk-skel" style={{ height: 88, borderRadius: 18 }} />
        <div className="pk-skel" style={{ height: 88, borderRadius: 18 }} />
      </div>
      <div className="pk-skel" style={{ height: 88, borderRadius: 18 }} />
    </div>
  );
}
