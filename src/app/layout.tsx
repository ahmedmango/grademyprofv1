import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import CookieConsent from "@/components/CookieConsent";
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
  title: "GradeMyProf — What Students Say",
  description: "Anonymous professor ratings across Bahrain. See what students really think before you enroll.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.grademyprofessor.net"),
  openGraph: {
    title: "GradeMyProf — What Students Say",
    description: "Anonymous professor ratings across Bahrain. See what students really think before you enroll.",
    siteName: "GradeMyProf",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GradeMyProf — What Students Say" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GradeMyProf — What Students Say",
    description: "Anonymous professor ratings across Bahrain. See what students really think before you enroll.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
            const d = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme:dark)').matches);
            if (d) document.documentElement.classList.add('dark');
            const l = localStorage.getItem('gmp_lang');
            if (l === 'ar') { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; }
          } catch {}
        `}} />
        <script defer data-domain="grademyprofessor.net" src="https://plausible.io/js/script.js" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --font-arabic: 'IBM Plex Sans Arabic', system-ui, sans-serif; } [dir="rtl"] body { font-family: var(--font-arabic); }` }} />
      </head>
      <body className={`${jakarta.variable} ${dmSans.variable} font-body min-h-screen bg-page`}>
        <Providers>
          <div className="max-w-2xl mx-auto">
            <Header />
            <main>{children}</main>
          </div>
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
