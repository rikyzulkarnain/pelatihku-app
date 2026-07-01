/**
 * Loading placeholders yang bentuknya menyerupai layout asli tiap halaman,
 * supaya tidak ada "lompatan" tata letak saat konten selesai dimuat.
 * Dipakai oleh `loading.tsx` masing-masing route.
 */

type SkelProps = {
  h: number | string;
  w?: number | string;
  r?: number;
  mb?: number;
  style?: React.CSSProperties;
};

function Skel({ h, w = "100%", r = 16, mb = 0, style }: SkelProps) {
  return (
    <div
      className="pk-skel"
      style={{ height: h, width: w, borderRadius: r, marginBottom: mb, flex: "none", ...style }}
    />
  );
}

function Scroll({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ position: "absolute", inset: 0, overflow: "hidden", padding: "6px 20px 120px" }}
      className="no-scrollbar"
    >
      {children}
    </div>
  );
}

function Title({ subtitle }: { subtitle?: boolean }) {
  return (
    <div style={{ padding: "8px 0 16px" }}>
      <Skel h={11} w={68} r={6} mb={10} />
      <Skel h={26} w="55%" r={10} mb={subtitle ? 10 : 0} />
      {subtitle && <Skel h={14} w="70%" r={8} />}
    </div>
  );
}

/** Generik — fallback umum. */
export default function PageSkeleton() {
  return (
    <Scroll>
      <Title />
      <Skel h={150} r={24} mb={16} />
      <Skel h={92} r={20} mb={16} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Skel h={88} r={18} />
        <Skel h={88} r={18} />
      </div>
      <Skel h={88} r={18} />
    </Scroll>
  );
}

export function NutritionSkeleton() {
  return (
    <Scroll>
      <Title />
      <Skel h={72} r={18} mb={14} />
      <Skel h={150} r={24} mb={14} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <Skel h={84} r={16} />
        <Skel h={84} r={16} />
        <Skel h={84} r={16} />
      </div>
      <Skel h={210} r={18} mb={20} />
      <Skel h={12} w="45%" r={6} mb={12} />
      <Skel h={64} r={14} mb={8} />
      <Skel h={64} r={14} mb={8} />
    </Scroll>
  );
}

export function ProgressSkeleton() {
  return (
    <Scroll>
      <Title />
      <Skel h={120} r={20} mb={14} />
      <Skel h={52} r={16} mb={14} />
      <Skel h={150} r={20} mb={14} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Skel h={88} r={18} />
        <Skel h={88} r={18} />
        <Skel h={88} r={18} />
        <Skel h={88} r={18} />
      </div>
      <Skel h={120} r={20} mb={14} />
      <Skel h={170} r={20} />
    </Scroll>
  );
}

export function ProgramSkeleton() {
  return (
    <Scroll>
      <Title subtitle />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        <Skel h={80} r={20} />
        <Skel h={80} r={20} />
        <Skel h={80} r={20} />
        <Skel h={80} r={20} />
      </div>
    </Scroll>
  );
}

export function HomeSkeleton() {
  return (
    <Scroll>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 18px" }}>
        <div>
          <Skel h={13} w={90} r={6} mb={8} />
          <Skel h={22} w={150} r={8} />
        </div>
        <Skel h={40} w={72} r={14} />
      </div>
      <Skel h={200} r={26} mb={16} />
      <Skel h={64} r={20} mb={16} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Skel h={84} r={18} />
        <Skel h={84} r={18} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Skel h={92} r={18} style={{ flex: 1 }} />
        <Skel h={92} r={18} style={{ flex: 1 }} />
      </div>
    </Scroll>
  );
}

export function LibrarySkeleton() {
  return (
    <Scroll>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0 16px" }}>
        <Skel h={38} w={38} r={12} />
        <Skel h={26} w="50%" r={10} />
      </div>
      <Skel h={46} r={14} mb={12} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Skel h={30} w={64} r={999} />
        <Skel h={30} w={80} r={999} />
        <Skel h={30} w={72} r={999} />
        <Skel h={30} w={68} r={999} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skel key={i} h={70} r={16} />
        ))}
      </div>
    </Scroll>
  );
}

export function CoachSkeleton() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      {/* header */}
      <div style={{ padding: "8px 20px 12px", borderBottom: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Skel h={42} w={42} r={14} />
          <div style={{ flex: 1 }}>
            <Skel h={17} w={110} r={8} mb={7} />
            <Skel h={12} w={150} r={6} />
          </div>
          <Skel h={38} w={38} r={12} />
          <Skel h={38} w={60} r={12} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Skel h={38} r={12} style={{ flex: 1 }} />
          <Skel h={40} w={40} r={12} />
        </div>
      </div>
      {/* messages */}
      <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Skel h={64} w="78%" r={16} />
        <Skel h={44} w="55%" r={16} style={{ alignSelf: "flex-end" }} />
        <Skel h={88} w="82%" r={16} />
        <Skel h={40} w="48%" r={16} style={{ alignSelf: "flex-end" }} />
      </div>
      {/* input */}
      <div style={{ padding: "10px 16px 14px", display: "flex", gap: 9 }}>
        <Skel h={48} w={48} r={16} />
        <Skel h={48} r={16} style={{ flex: 1 }} />
        <Skel h={48} w={48} r={16} />
      </div>
    </div>
  );
}

export function SessionSkeleton() {
  return (
    <Scroll>
      <Title />
      <Skel h={140} r={20} mb={14} />
      <Skel h={140} r={20} mb={14} />
      <Skel h={140} r={20} />
    </Scroll>
  );
}
