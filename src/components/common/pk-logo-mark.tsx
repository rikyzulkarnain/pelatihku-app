/** Logo PelatihKu (dari public/icons). Dipakai di splash & loader. */
export default function PkLogoMark({ size = 84 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/icon-512.png"
      alt="PelatihKu"
      width={size}
      height={size}
      className="pk-logo-mark"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.31) }}
    />
  );
}
