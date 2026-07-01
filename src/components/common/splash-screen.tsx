import PkLogoMark from "./pk-logo-mark";

/**
 * Splash screen bermerk yang tampil instan saat dokumen dimuat (mis. saat app
 * PWA diluncurkan), lalu memudar sendiri via CSS. Tidak butuh JS.
 */
export default function SplashScreen() {
  return (
    <div id="pk-splash" aria-hidden="true">
      <div className="pk-splash-inner">
        <PkLogoMark />
        <div className="pk-splash-name">PelatihKu</div>
        <div className="pk-spinner" />
      </div>
    </div>
  );
}
