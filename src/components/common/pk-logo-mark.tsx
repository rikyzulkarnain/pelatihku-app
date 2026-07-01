/** Logo dumbbell PelatihKu (kotak lime). Dipakai di splash & loader. */
export default function PkLogoMark({ size = 84 }: { size?: number }) {
  const icon = Math.round(size * 0.45);
  return (
    <div className="pk-logo-mark" style={{ width: size, height: size, borderRadius: Math.round(size * 0.31) }}>
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="#10130a" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="8.5" x2="9" y2="15.5" />
        <line x1="15" y1="8.5" x2="15" y2="15.5" />
        <line x1="6.5" y1="9.8" x2="6.5" y2="14.2" />
        <line x1="17.5" y1="9.8" x2="17.5" y2="14.2" />
      </svg>
    </div>
  );
}
