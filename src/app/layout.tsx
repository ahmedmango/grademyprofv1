import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GradeMyProfessor — What Students Say | Bahrain",
  description:
    "Anonymous professor ratings by real students across Bahrain universities. Find the right professor before you register.",
  openGraph: {
    title: "GradeMyProfessor Bahrain",
    description: "What Students Say — anonymous ratings by real students.",
    siteName: "GradeMyProfessor",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto">{children}</div>
      </body>
    </html>
  );
}
