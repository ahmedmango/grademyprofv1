import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = createServerClient();

  const { data: universities } = await supabase
    .from("universities").select("*").eq("is_active", true).order("name_en");

  const { data: topProfessors } = await supabase
    .from("aggregates_professor")
    .select("*, professors ( id, name_en, slug, departments ( name_en ), universities ( name_en, slug ) )")
    .order("review_count", { ascending: false })
    .limit(6);

  return (
    <div className="px-5 pb-10">
      {/* Hero */}
      <div className="pt-14 mb-9 text-center">
        <span className="inline-block bg-brand-50 text-brand-500 text-xs font-semibold tracking-widest uppercase px-3.5 py-1 rounded-full mb-4">
          Bahrain
        </span>
        <h1 className="font-display text-4xl font-black leading-none text-brand-600">
          Grade My<br />Professor
        </h1>
        <p className="text-gray-500 text-sm mt-3.5 leading-relaxed">
          <span className="text-brand-500 font-semibold">What Students Say</span> — anonymous ratings
          <br />by real students across Bahrain.
        </p>
      </div>

      {/* Search */}
      <Link href="/search"
        className="flex items-center gap-3 bg-brand-50/60 rounded-2xl px-4 py-3.5 mb-8 border border-brand-100 hover:border-brand-300 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="text-gray-400 text-sm">Search professor or course…</span>
      </Link>

      {/* Universities */}
      <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Universities</h2>
      <div className="grid grid-cols-2 gap-2.5 mb-9">
        {(universities || []).map((u) => (
          <Link key={u.id} href={`/u/${u.slug}`}
            className="bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5 transition-all">
            <div className="text-sm font-semibold text-brand-900 leading-tight">{u.name_en}</div>
            {u.name_ar && <div className="text-xs text-gray-400 mt-1" dir="rtl">{u.name_ar}</div>}
          </Link>
        ))}
      </div>

      {/* Trending */}
      {topProfessors && topProfessors.length > 0 && (
        <>
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">🔥 Trending</h2>
          <div className="space-y-2.5">
            {topProfessors.map((ap: any) => {
              const p = ap.professors;
              if (!p) return null;
              const qColor = ap.avg_quality >= 4 ? "text-green-600" : ap.avg_quality >= 3 ? "text-amber-600" : "text-red-600";
              return (
                <Link key={ap.professor_id} href={`/p/${p.slug}`}
                  className="flex items-center justify-between bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5 transition-all">
                  <div>
                    <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                    <div className="text-xs text-gray-400">{p.departments?.name_en} · {p.universities?.name_en}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold font-display ${qColor}`}>{Number(ap.avg_quality).toFixed(1)}</div>
                    <div className="text-xs text-gray-400">{ap.review_count} ratings</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Registration CTA */}
      <div className="mt-8 bg-brand-50 rounded-2xl p-5 border border-brand-100 text-center">
        <div className="text-2xl mb-1.5">📚</div>
        <div className="text-sm font-bold text-brand-600">Registration Season</div>
        <div className="text-xs text-gray-500 mt-1 leading-relaxed">
          Search your course codes now and find the best professors before seats fill up.
        </div>
      </div>
    </div>
  );
}
