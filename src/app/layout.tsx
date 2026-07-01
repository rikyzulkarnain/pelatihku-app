import type { Metadata, Viewport } from "next";
import { Archivo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-client";
import { ThemeProvider } from "@/providers/theme-provider";
import ServiceWorkerRegister from "@/components/common/service-worker-register";
import SplashScreen from "@/components/common/splash-screen";
import InstallProvider from "@/providers/install-provider";
import { Toaster } from "sonner";

// Tangkap event install sedini mungkin (sebelum React hydrate) agar tidak hilang.
const INSTALL_CAPTURE = `(function(){
  window.__pkInstall = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    window.__pkInstall = e;
    window.dispatchEvent(new Event('pk-installable'));
  });
  window.addEventListener('appinstalled', function(){
    window.__pkInstall = null;
    window.dispatchEvent(new Event('pk-installed'));
  });
})();`;

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-archivo",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  applicationName: "PelatihKu",
  title: "PelatihKu — Pelatih pribadi di sakumu",
  description:
    "Program latihan, panduan teknik, nutrisi & AI coach pribadi dalam satu genggaman.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PelatihKu",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0e08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn("h-full antialiased", archivo.variable, jakarta.variable)}
    >
      <body className="font-sans min-h-full">
        <script dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE }} />
        <SplashScreen />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <InstallProvider>{children}</InstallProvider>
            <Toaster position="top-center" theme="dark" richColors />
          </QueryProvider>
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
