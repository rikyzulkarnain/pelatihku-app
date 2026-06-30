import type { Metadata, Viewport } from "next";
import { Archivo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-client";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";

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
  title: "PelatihKu — Pelatih pribadi di sakumu",
  description:
    "Program latihan, panduan teknik, nutrisi & AI coach pribadi dalam satu genggaman.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster position="top-center" theme="dark" richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
