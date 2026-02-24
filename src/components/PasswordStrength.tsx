"use client";

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "var(--border)" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "#EF4444" };
  if (score === 2) return { score: 2, label: "Fair", color: "#F97316" };
  if (score === 3) return { score: 3, label: "Good", color: "#EAB308" };
  if (score >= 4) return { score: 4, label: "Strong", color: "#22C55E" };
  return { score: 0, label: "", color: "var(--border)" };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex-1 flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? color : "var(--border)" }}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export function PasswordMatchIndicator({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const match = password === confirm;

  return (
    <div className="mt-1 flex items-center gap-1">
      {match ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: "#22C55E" }}>Passwords match</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: "#EF4444" }}>Passwords don&apos;t match</span>
        </>
      )}
    </div>
  );
}
