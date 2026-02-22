import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtRating } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { courseSlug: string } }) {
  const supabase = createServerClient();
  const { data: course } = await supabase.from("courses").select("code, title_en, universities ( name_en )").eq("slug", params.courseSlug).single();
  if (!course) return { title: "Course Not Found" };
  return {
    title: `${course.code} — ${course.title_en} | GradeMyProfessor`,
    description: `See which professors teach ${course.code} and what students say about them at ${(course as any).universities?.name_en}.`,
  };
}

export default async function CoursePage({ params }: { params: { courseSlug: string } }) {
  const supabase = createServerClient();
  const { data: course } = await supabase.from("courses")
    .select(`id, code, title_en, title_ar, slug, universities ( id, name_en, slug ), departments ( id, name_en )`)
    .eq("slug", params.courseSlug).single();
  if (!course) return notFound();

  const uni = (course as any).universities;
  const dept = (course as any).departments;

  const { data: profCourses } = await supabase.from("professor_courses")
    .select(`professors ( id, name_en, name_ar, slug, departments ( name_en ),
      aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags ) )`)
    .eq("course_id", course.id);

  const professors = (profCourses || []).map((pc: any) => pc.professors).filter(Boolean)
    .sort((a: any, b: any) => {
      const ac = a.aggregates_professor?.review_count ?? a.aggregates_professor?.[0]?.review_count ?? 0;
      const bc = b.aggregates_professor?.review_count ?? b.aggregates_professor?.[0]?.review_count ?? 0;
      return bc - ac;
    });

  const { data: reviews } = await supabase.from("reviews")
    .select(`id, rating_quality, rating_difficulty, would_take_again, tags, comment, created_at, professors ( name_en, slug )`)
    .eq("course_id", course.id).eq("status", "live").order("created_at", { ascending: false }).limit(10);

  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";
  const dc = (v: number) => v >= 4 ? "text-red-600" : v >= 3 ? "text-amber-600" : "text-green-600";

  return (
    <div className="pb-10">
      <div className="px-5 pt-4 flex items-center gap-3 mb-5">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <span className="text-xs text-gray-400">{uni?.name_en} · {dept?.name_en || "General"}</span>
      </div>

      <div className="px-5 mb-7">
        <div className="inline-block bg-brand-50 text-brand-500 text-sm font-bold px-3 py-1 rounded-lg mb-2">{course.code}</div>
        <h1 className="font-display text-xl font-extrabold text-brand-600 leading-tight">{course.title_en}</h1>
        {course.title_ar && <p className="text-sm text-gray-400 mt-1" dir="rtl">{course.title_ar}</p>}
      </div>

      <div className="px-5 mb-7">
        <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">👩‍🏫 Who Teaches This Course</h2>
        {professors.length > 0 ? (
          <div className="space-y-2.5">
            {professors.map((p: any) => {
              const agg = p.aggregates_professor;
              const avgQ = agg?.avg_quality ?? agg?.[0]?.avg_quality ?? 0;
              const count = agg?.review_count ?? agg?.[0]?.review_count ?? 0;
              const wta = agg?.would_take_again_pct ?? agg?.[0]?.would_take_again_pct ?? null;
              const topTags = agg?.top_tags ?? agg?.[0]?.top_tags ?? [];
              return (
                <Link key={p.id} href={`/p/${p.slug}`}
                  className="block bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.departments?.name_en}</div>
                      {topTags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">{topTags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md">{tag}</span>
                        ))}</div>
                      )}
                    </div>
                    {count > 0 ? (
                      <div className="text-right ml-3 shrink-0">
                        <div className={`text-xl font-extrabold font-display ${qc(avgQ)}`}>{fmtRating(avgQ)}</div>
                        <div className="text-[10px] text-gray-400">{count} ratings</div>
                        {wta !== null && wta > 0 && <div className="text-[10px] text-gray-400">{Math.round(wta)}% retake</div>}
                      </div>
                    ) : (
                      <div className="text-right ml-3 shrink-0"><div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">No ratings yet</div></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">📚</div>
            <p className="text-sm">No professors linked to this course yet.</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to rate a professor for {course.code}!</p>
          </div>
        )}
      </div>

      {reviews && reviews.length > 0 && (
        <div className="px-5 mb-7">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">💬 Recent Reviews for {course.code}</h2>
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-brand-50/40 rounded-2xl p-4 border border-brand-100">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/p/${r.professors?.slug}`} className="text-sm font-semibold text-brand-500 hover:underline">{r.professors?.name_en}</Link>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${qc(r.rating_quality)}`}>Q: {fmtRating(r.rating_quality)}</span>
                    <span className={`text-sm font-bold ${dc(r.rating_difficulty)}`}>D: {fmtRating(r.rating_difficulty)}</span>
                  </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
