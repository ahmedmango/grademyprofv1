"use client";

export default function AppleLogo({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path
        d="M50 8 C50 8, 55 2, 62 4"
        stroke={color || "var(--accent)"}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaf */}
      <path
        d="M54 10 C58 4, 68 3, 65 12 C62 8, 56 8, 54 10Z"
        fill={color || "var(--accent)"}
        opacity="0.7"
      />
      {/* Apple body */}
      <path
        d="M50 18
           C35 18, 15 32, 15 55
           C15 78, 30 92, 42 92
           C46 92, 48 89, 50 89
           C52 89, 54 92, 58 92
           C70 92, 85 78, 85 55
           C85 32, 65 18, 50 18Z"
        fill={color || "var(--accent)"}
      />
      {/* Highlight */}
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
  );
}
