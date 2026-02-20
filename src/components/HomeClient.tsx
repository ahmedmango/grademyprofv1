"use client";

import Link from "next/link";
import { useApp } from "./Providers";
import { t } from "@/lib/i18n";
import { fmtRating } from "@/lib/utils";

function ratingClass(v: number) {
  return v >= 4 ? "high" : v >= 2.5 ? "mid" : "low";
}

function ratingColor(v: number) {
  return v >= 4 ? "var(--rating-high)" : v >= 2.5 ? "var(--rating-mid)" : "var(--rating-low)";
}

export default function HomeClient({
  universities, topProfessors, recentReviews, totalReviews, totalUniversities, totalProfessors,
}: {
  universities: any[]; topProfessors: any[]; recentReviews: any[];
  totalReviews: number; totalUniversities: number; totalProfessors: number;
}) {
  const { lang } = useApp();

  return (
    <div className="px-5 pb-12">
      {/* Hero */}
      <div className="pt-10 mb-8">
        <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-tight">
          <span style={{ color: "var(--accent)" }}>{lang === "ar" ? "قيّم" : "Grade"}</span>{" "}
          {lang === "ar" ? "أستاذي" : "My Professor"}
        </h1>
        <p className="text-secondary text-sm mt-2.5 leading-relaxed max-w-xs">
          {t(lang, "tagline")}
        </p>
      </div>

      {/* Search bar */}
      <Link href="/search"
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-4 transition"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="text-tertiary text-sm">{t(lang, "search_placeholder")}</span>
      </Link>

      {/* Stats strip */}
      <div className="flex items-center justify-center gap-6 mb-8 py-2">
        <div className="text-center">
          <div className="font-display font-extrabold text-lg" style={{ color: "var(--accent)" }}>{totalReviews}+</div>
          <div className="text-tertiary text-[10px] uppercase tracking-wider font-medium">{t(lang, "stats_reviews")}</div>
        </div>
        <div className="w-px h-6" style={{ background: "var(--border)" }} />
        <div className="text-center">
          <div className="font-display font-extrabold text-lg">{totalUniversities}</div>
          <div className="text-tertiary text-[10px] uppercase tracking-wider font-medium">{t(lang, "stats_universities")}</div>
        </div>
        <div className="w-px h-6" style={{ background: "var(--border)" }} />
        <div className="text-center">
          <div className="font-display font-extrabold text-lg">{totalProfessors}</div>
          <div className="text-tertiary text-[10px] uppercase tracking-wider font-medium">{t(lang, "stats_professors")}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2.5 mb-8">
        <Link href="/my-reviews"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition card-flat"
          style={{ color: "var(--text-secondary)" }}
        >
          {t(lang, "my_reviews")}
        </Link>
        <Link href="/search"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {t(lang, "rate_professor")}
        </Link>
      </div>

      {/* Trending Professors */}
      {topProfessors.length > 0 && (
        <section className="mb-8">
          <div className="section-label mb-3">🔥 {t(lang, "trending")}</div>
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 stagger-children">
            {topProfessors.map((item: any) => {
              const name = lang === "ar" ? (item.name_ar || item.name_en || item.professors?.name_en) : (item.name_en || item.professors?.name_en);
              const slug = item.slug || item.professors?.slug;
              const uni = item.university_name || item.professors?.universities?.name_en;
              const avgQ = Number(item.avg_quality);
              if (!name || !slug) return null;

              return (
                <Link key={item.professor_id} href={`/p/${slug}`}
                  className="flex-shrink-0 w-36 p-3.5 rounded-2xl transition"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className={`rating-circle ${ratingClass(avgQ)} mb-2.5`}>
                    {fmtRating(avgQ)}
                  </div>
                  <div className="font-display font-bold text-sm leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>
                    {name}
                  </div>
                  <div className="text-[10px] mt-1 line-clamp-1" style={{ color: "var(--text-tertiary)" }}>
                    {uni}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {item.review_count} {t(lang, "ratings")}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Universities */}
      <section className="mb-8">
        <div className="section-label mb-3">{t(lang, "universities")}</div>
        <div className="flex flex-wrap gap-2 stagger-children">
          {universities.map((u: any) => (
            <Link key={u.id} href={`/u/${u.slug}`}
              className="px-3.5 py-2 rounded-xl text-xs font-medium transition"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {lang === "ar" && u.name_ar ? u.name_ar : u.name_en}
            </Link>
          ))}
        </div>
      </section>

      {/* Rewards CTA */}
      <section className="mb-8">
        <div className="p-5 rounded-2xl text-center" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
          <div className="text-xl mb-1.5">🎁</div>
          <div className="font-display font-bold text-sm" style={{ color: "var(--accent)" }}>{t(lang, "earn_rewards")}</div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {t(lang, "rewards_desc")}
          </p>
          <Link href="/search"
            className="inline-block mt-3 px-5 py-2 rounded-lg text-xs font-semibold transition"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {t(lang, "start_rating")} →
          </Link>
        </div>
      </section>

      {/* Recent Reviews (social proof) */}
      {recentReviews.length > 0 && (
        <section className="mb-4">
          <div className="section-label mb-3">💬 {lang === "ar" ? "آخر التقييمات" : "Recent Reviews"}</div>
          <div className="space-y-2 stagger-children">
            {recentReviews.slice(0, 3).map((r: any) => (
              <div key={r.id} className="card-flat p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`rating-circle ${ratingClass(r.rating_quality)}`} style={{ width: 36, height: 36, fontSize: 14, borderRadius: 8 }}>
                    {fmtRating(r.rating_quality)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.comment && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-primary)" }}>
                        "{r.comment}"
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Link href={`/p/${r.professors?.slug}`} className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                        {r.professors?.name_en}
                      </Link>
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        · {r.universities?.name_en}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
