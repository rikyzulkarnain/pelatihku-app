// Service worker minimal untuk PelatihKu (PWA).
// v2 — perbaikan: JANGAN intercept fetch internal Next.js (RSC/router.refresh)
// dan JANGAN cache halaman ber-auth. SW lama meng-intercept semuanya dan
// membalas Response.error() saat gagal → Chrome menampilkan "This page
// couldn't load" tepat setelah server action sukses (generate/ubah/kembalikan).
const CACHE = "pelatihku-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Aset yang aman di-cache: immutable build assets & file statis publik.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Fetch internal Next.js App Router (RSC payload / prefetch / refresh):
  // BIARKAN browser yang menangani — meng-intercept ini membuat router.refresh
  // setelah server action bisa gagal dan berujung halaman error Chrome.
  if (url.searchParams.has("_rsc") || req.headers.get("rsc") === "1") return;

  // ── Aset statis: cache-first (immutable, ber-hash per build) ──────────
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })(),
    );
    return;
  }

  // ── Navigasi (buka/reload halaman): network-first, TANPA menyimpan HTML
  // ber-auth ke cache. Saat offline → halaman offline sederhana, JANGAN
  // pernah Response.error() (itu memicu "This page couldn't load").
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(
            `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline — PelatihKu</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#0d0f0a;color:#e8ecdf;font-family:system-ui,sans-serif;text-align:center;padding:24px}b{color:#c9fb3c}</style></head><body><div><h2>Kamu sedang <b>offline</b></h2><p>Periksa koneksi internet lalu tarik untuk memuat ulang.</p></div></body></html>`,
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Request GET lainnya (data dinamis, dsb.) tidak di-intercept sama sekali.
});
