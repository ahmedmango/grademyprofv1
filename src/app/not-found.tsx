import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 pb-10 pt-16 text-center max-w-md mx-auto">
      <div className="text-6xl mb-4">🍎</div>
      <h1 className="font-display text-2xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
        Page Not Found
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        ← Back to Home
      </Link>
    </div>
  );
}
