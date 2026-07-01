"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __pkInstall?: PromptEvent | null;
  }
}

type InstallContextValue = {
  canInstall: boolean;
  isIOS: boolean;
  installed: boolean;
  promptInstall: () => Promise<void>;
};

const InstallContext = createContext<InstallContextValue>({
  canInstall: false,
  isIOS: false,
  installed: false,
  promptInstall: async () => {},
});

export const useInstall = () => useContext(InstallContext);

/**
 * Menyimpan event `beforeinstallprompt` yang ditangkap sedini mungkin (lewat
 * script inline di layout, disimpan di window.__pkInstall) agar tombol Install
 * bisa muncul di halaman mana pun — tidak hilang saat pindah rute.
 */
export default function InstallProvider({ children }: { children: React.ReactNode }) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)) setIsIOS(true);

    // Event mungkin sudah tertangkap sebelum React mount.
    if (window.__pkInstall) setCanInstall(true);

    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener("pk-installable", onInstallable);
    window.addEventListener("pk-installed", onInstalled);
    return () => {
      window.removeEventListener("pk-installable", onInstallable);
      window.removeEventListener("pk-installed", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const e = window.__pkInstall;
    if (!e) return;
    await e.prompt();
    const choice = await e.userChoice;
    if (choice.outcome === "accepted") {
      window.__pkInstall = null;
      setCanInstall(false);
    }
  }, []);

  return (
    <InstallContext.Provider value={{ canInstall, isIOS, installed, promptInstall }}>
      {children}
    </InstallContext.Provider>
  );
}
