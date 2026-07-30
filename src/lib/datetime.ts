/**
 * Formatter tanggal untuk panel admin.
 *
 * Halaman admin adalah server component (`force-dynamic`), jadi `format()` dari
 * date-fns memakai timezone server — di Vercel itu UTC, sehingga jam tampil
 * meleset 7 jam dari waktu setempat. Semua formatter di bawah mengunci zona
 * waktu ke WIB lewat `Intl`, supaya hasilnya sama di server maupun di browser.
 */

const WIB = "Asia/Jakarta";

const WIB_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: WIB,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsWIB(value: string | Date) {
  const parts = WIB_FORMATTER.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** `25 Jul 2026` */
export function formatDateWIB(value: string | Date): string {
  const t = partsWIB(value);
  return `${t.day} ${t.month} ${t.year}`;
}

/** `25 Jul 2026, 21:07` — `separator` dipakai halaman Masukan sebagai " · ". */
export function formatDateTimeWIB(value: string | Date, separator = ", "): string {
  const t = partsWIB(value);
  return `${t.day} ${t.month} ${t.year}${separator}${t.hour}:${t.minute}`;
}

/** `25 Jul, 21:07` — tanpa tahun, untuk kolom sempit. */
export function formatShortDateTimeWIB(value: string | Date): string {
  const t = partsWIB(value);
  return `${t.day} ${t.month}, ${t.hour}:${t.minute}`;
}
