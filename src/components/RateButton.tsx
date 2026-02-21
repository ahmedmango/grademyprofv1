"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RateButton({
  professorId,
  professorName,
  professorSlug,
  courses,
}: {
  professorId: string;
  professorName: string;
  professorSlug: string;
  courses: { id: string; code: string; title_en: string }[];
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const lastName = professorName.split(" ").pop();

  const handleRate = (courseId?: string, courseName?: string) => {
    if (courses.length === 0) {
      router.push(`/rate?professorId=${professorId}&professorName=${encodeURIComponent(professorName)}&professorSlug=${professorSlug}`);
      return;
    }

    if (courses.length === 1 || courseId) {
      const cId = courseId || courses[0].id;
      const cName = courseName || `${courses[0].code} ${courses[0].title_en}`;
      router.push(`/rate?professorId=${professorId}&courseId=${cId}&professorName=${encodeURIComponent(professorName)}&courseName=${encodeURIComponent(cName)}&professorSlug=${professorSlug}`);
      return;
    }

    setShowPicker(true);
  };

  return (
    <>
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 animate-slide-up"
            style={{ background: "var(--bg-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <h3 className="font-display font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
              Which course?
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
              Select the course you took with {lastName}
            </p>
            <div className="space-y-2">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowPicker(false);
                    handleRate(c.id, `${c.code} ${c.title_en}`);
                  }}
                  className="w-full text-left p-3.5 rounded-xl transition-all duration-150 active:scale-[0.98]"
                  style={{ background: "var(--bg-surface-alt, var(--bg-primary))", border: "1px solid var(--border)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{c.code}</span>
                  <span className="text-sm ml-2" style={{ color: "var(--text-primary)" }}>{c.title_en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 z-50"
        style={{ background: "linear-gradient(transparent, var(--bg-primary) 30%)" }}>
        <button
          onClick={() => handleRate()}
          className="block w-full py-4 rounded-2xl text-white text-center font-bold text-base transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "var(--accent)",
            boxShadow: "0 8px 24px rgba(217,80,48,0.25)",
          }}
        >
          ✍️ Rate {lastName}
        </button>
      </div>
    </>
  );
}
