"use client";

import Link from "next/link";

export default function RateButton({ professorName, professorSlug }: { professorName: string; professorSlug: string }) {
  const lastName = professorName.split(" ").pop();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-50">
      <Link href={`/rate?professor=${professorSlug}`}
        className="block w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-center font-bold text-base shadow-lg shadow-brand-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 transition-all">
        ✍️ Rate {lastName}
      </Link>
    </div>
  );
}
