"use client";

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-up">
      <div className="loading-pulse mb-4">
        <svg
          width={48}
          height={48}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 8 C50 8, 55 2, 62 4"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M54 10 C58 4, 68 3, 65 12 C62 8, 56 8, 54 10Z"
            fill="var(--accent)"
            opacity="0.7"
          />
          <path
            d="M50 18
               C35 18, 15 32, 15 55
               C15 78, 30 92, 42 92
               C46 92, 48 89, 50 89
               C52 89, 54 92, 58 92
               C70 92, 85 78, 85 55
               C85 32, 65 18, 50 18Z"
            fill="var(--accent)"
          />
          <path
            d="M35 40
               C32 45, 28 55, 30 65"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.3"
            fill="none"
          />
        </svg>
      </div>
      <p
        className="text-sm font-semibold tracking-wide"
        style={{ color: "var(--text-tertiary)" }}
      >
        Loading…
      </p>
    </div>
  );
}
