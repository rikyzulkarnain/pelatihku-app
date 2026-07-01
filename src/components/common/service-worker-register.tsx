"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker agar app bisa di-install & jalan offline. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Daftarkan setelah load agar tidak mengganggu render awal.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
