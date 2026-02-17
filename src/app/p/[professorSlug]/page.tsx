import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { fmtRating } from "@/lib/utils";
import RateButton from "@/components/RateButton";

export default async function ProfessorPage({ params }: { params: { professorSlug: string } }) {
  const supabase = createServerClient();

  const { data: prof } = await supabase
    .from("professors")
    .select(`id, name_en, name_ar, slug, photo_url,
      departments ( id, name_en ),
      universities ( id, name_en, slug ),
      aggregates_professor ( review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist ),
      professor_courses ( courses ( id, code, title_en, slug ) )`)
    .eq("slug", params.professorSlug)
    .eq("is_active", true)
    .single();

  if (!prof) return notFound();

  const agg = (prof as any).aggregates_professor || { review_count: 0, avg_quality: 0, avg_difficulty: 0, would_take_again_pct: 0, rating_dist: {}, tag_dist: {} };
  const dept = (prof as any).departments;
  const uni = (prof as any).universities;
  const courses = ((prof as any).professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, created_at, courses ( code )")
    .eq("professor_id", prof.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(20);

  const ratingDist = agg.rating_dist || {};
  const maxDist = Math.max(...Object.values(ratingDist).map(Number), 1);
  const topTags = Object.entries(agg.tag_dist || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  const maxTag = Number(topTags[0]?.[1]) || 1;

  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";
  const dc = (v: number) => v >= 4 ? "text-red-600" : v >= 3 ? "text-amber-600" : "text-green-600";

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-4 flex items-center gap-3 mb-5">
        <a href="/" className="text-gray-400 text-lg">←</a>
        <span className="text-xs text-gray-400">{uni?.name_en} · {dept?.name_en}</span>
      </div>

      {/* Profile */}
      <div className="px-5 mb-7">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-brand-500 font-bold text-lg shrink-0">
            {prof.name_en.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold text-brand-600 leading-tight">{prof.name_en}</h1>
            <p className="text-xs text-gray-500 mt-1">{dept?.name_en}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-brand-50/50 rounded-2xl p-3.5 border border-brand-100 text-center">
            <div className={`text-2xl font-extrabold font-display ${qc(agg.avg_quality)}`}>{fmtRating(agg.avg_quality)}</div>
            <div className="text-xs text-gray-400 mt-1">Quality</div>
          </div>
          <div className="bg-brand-50/50 rounded-2xl p-3.5 border border-brand-100 text-center">
            <div className={`text-2xl font-extrabold font-display ${dc(agg.avg_difficulty)}`}>{fmtRating(agg.avg_difficulty)}</div>
            <div className="text-xs text-gray-400 mt-1">Difficulty</div>
          </div>
          <div className="bg-brand-50/50 rounded-2xl p-3.5 border border-brand-100 text-center">
            <div className="text-2xl font-extrabold font-display text-brand-500">{agg.would_take_again_pct}%</div>
            <div className="text-xs text-gray-400 mt-1">Would Retake</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Based on {agg.review_count} ratings</p>
      </div>

      {/* Rating Distribution */}
      <div className="px-5 mb-7">
        <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Rating Distribution</h2>
        <div className="bg-brand-50/40 rounded-2xl p-4 border border-brand-100">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <span className="text-xs text-gray-400 w-3 text-right font-medium">{n}</span>
              <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${(Number(ratingDist[n] || 0) / maxDist) * 100}%`,
                  backgroundColor: n >= 4 ? "#16A34A" : n === 3 ? "#CA8A04" : "#DC2626",
                }} />
              </div>
              <span className="text-xs text-gray-400 w-5 text-right">{ratingDist[n] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {topTags.length > 0 && (
        <div className="px-5 mb-7">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Top Tags</h2>
          <div className="space-y-2.5">
            {topTags.map(([tag, count]: any) => (
              <div key={tag}>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-700">{tag}</span><span className="text-xs text-gray-400">{count}</span></div>
                <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style={{ width: `${(Number(count) / maxTag) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      {courses.length > 0 && (
        <div className="px-5 mb-7">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Courses</h2>
          <div className="flex gap-2 flex-wrap">
            {courses.map((c: any) => (
              <span key={c.id} className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-500">{c.code}</span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="px-5 mb-7">
        <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">
          💬 What Students Say
        </h2>
        <div className="space-y-3">
          {(reviews || []).map((r: any) => (
            <div key={r.id} className="bg-brand-50/40 rounded-2xl p-4 border border-brand-100">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`text-base font-extrabold font-display ${qc(r.rating_quality)}`}>{fmtRating(r.rating_quality)}</div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide">quality</div>
                  </div>
                  <div className="w-px h-5 bg-brand-100" />
                  <div className="text-center">
                    <div className={`text-base font-extrabold font-display ${dc(r.rating_difficulty)}`}>{fmtRating(r.rating_difficulty)}</div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide">difficulty</div>
                  </div>
                </div>
                <span className="text-xs text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md font-semibold">{r.courses?.code}</span>
              </div>
              {r.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">{r.tags.map((t: string) => (
                  <span key={t} className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md">{t}</span>
                ))}</div>
              )}
              {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
              <div className="text-[10px] text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
          ))}
          {(!reviews || reviews.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm">No reviews yet. Be the first to share what students say!</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Rate CTA */}
      <RateButton professorName={prof.name_en} professorSlug={prof.slug} />
    </div>
  );
}
