import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

/* Display font: Plus Jakarta Sans — geometric, modern, with personality */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

/* Body font: DM Sans — clean, readable, slightly warmer than Inter */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grade My Professor — Bahrain",
  description: "Student-powered professor ratings across Bahrain. Anonymous, honest, helpful.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.bh"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('gmp_theme');
            const d = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
            if (d) document.documentElement.classList.add('dark');
            const l = localStorage.getItem('gmp_lang');
            if (l === 'ar') { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; }
          } catch {}
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --font-arabic: 'IBM Plex Sans Arabic', system-ui, sans-serif; } [dir="rtl"] body { font-family: var(--font-arabic); }` }} />
      </head>
      <body className={`${jakarta.variable} ${dmSans.variable} font-body min-h-screen bg-page`}>
        <Providers>
          <div className="max-w-lg mx-auto">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
