import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtRating } from "@/lib/utils";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { courseSlug: string } }) {
  const supabase = createServerClient();
  const { data: course } = await supabase
    .from("courses")
    .select("code, title_en, universities ( name_en )")
    .eq("slug", params.courseSlug)
    .single();
  if (!course) return { title: "Course Not Found" };
  return {
    title: `${course.code} — ${course.title_en} | GradeMyProfessor`,
    description: `See which professors teach ${course.code} and what students say about them at ${(course as any).universities?.name_en}.`,
  };
}

function qualityColor(v: number): string {
  if (v >= 4) return "#22C55E";
  if (v >= 3) return "#EAB308";
  if (v >= 2) return "#F97316";
  return "#EF4444";
}

function qualityBg(v: number): string {
  if (v >= 4) return "#22C55E20";
  if (v >= 3) return "#EAB30820";
  if (v >= 2) return "#F9731620";
  return "#EF444420";
}

export default async function CoursePage({ params }: { params: { courseSlug: string } }) {
  const supabase = createServerClient();

  const { data: course } = await supabase
    .from("courses")
    .select(`id, code, title_en, title_ar, slug,
      universities ( id, name_en, slug ),
      departments ( id, name_en )`)
    .eq("slug", params.courseSlug)
    .single();

  if (!course) return notFound();

  const uni = (course as any).universities;
  const dept = (course as any).departments;

  const { data: profCourses } = await supabase
    .from("professor_courses")
    .select(`professors ( id, name_en, slug, departments ( name_en ),
      aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags ) )`)
    .eq("course_id", course.id);

  const professors = (profCourses || [])
    .map((pc: any) => pc.professors)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const ac = a.aggregates_professor?.review_count ?? a.aggregates_professor?.[0]?.review_count ?? 0;
      const bc = b.aggregates_professor?.review_count ?? b.aggregates_professor?.[0]?.review_count ?? 0;
      return bc - ac;
    });

  const { data: reviews } = await supabase
    .from("reviews")
    .select(`id, rating_quality, rating_difficulty, would_take_again, tags, comment, created_at,
      professors ( name_en, slug )`)
    .eq("course_id", course.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="pb-10">
      {/* Back nav */}
      <div className="px-5 pt-4 flex items-center gap-3 mb-4">
        <Link
          href={uni ? `/u/${uni.slug}` : "/"}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90"
          style={{ color: "var(--accent)" }}
        >
          ←
        </Link>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {uni?.name_en}{dept?.name_en ? ` · ${dept.name_en}` : ""}
        </span>
      </div>

      {/* Course header */}
      <div className="px-5 mb-7">
        <div
          className="inline-block text-sm font-bold px-3 py-1 rounded-lg mb-2"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {course.code}
        </div>
        <h1
          className="font-display text-xl font-extrabold leading-tight mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {course.title_en}
        </h1>
        {course.title_ar && (
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }} dir="rtl">
            {course.title_ar}
          </p>
        )}
      </div>

      {/* Professors */}
      <div className="px-5 mb-7">
        <div className="section-label mb-3">Who Teaches This Course</div>
        {professors.length > 0 ? (
          <div className="space-y-2.5">
            {professors.map((p: any) => {
              const agg = p.aggregates_professor;
              const avgQ = agg?.avg_quality ?? agg?.[0]?.avg_quality ?? 0;
              const count = agg?.review_count ?? agg?.[0]?.review_count ?? 0;
              const wta = agg?.would_take_again_pct ?? agg?.[0]?.would_take_again_pct ?? null;
              const topTags: string[] = agg?.top_tags ?? agg?.[0]?.top_tags ?? [];
              return (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  className="block p-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {p.name_en}
                      </div>
                      {p.departments?.name_en && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {p.departments.name_en}
                        </div>
                      )}
                      {topTags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {topTags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {count > 0 ? (
                      <div className="text-right shrink-0">
                        <div
                          className="text-xl font-extrabold font-display"
                          style={{ color: qualityColor(avgQ) }}
                        >
                          {fmtRating(avgQ)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {count} {count === 1 ? "rating" : "ratings"}
                        </div>
                        {wta !== null && wta > 0 && (
                          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                            {Math.round(wta)}% retake
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="shrink-0">
                        <div
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                        >
                          No ratings
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
            <div className="text-2xl mb-2">📚</div>
            <p className="text-sm">No professors linked to this course yet.</p>
            <p className="text-xs mt-1">Be the first to rate a professor for {course.code}!</p>
          </div>
        )}
      </div>

      {/* Recent reviews */}
      {reviews && reviews.length > 0 && (
        <div className="px-5 mb-7">
          <div className="section-label mb-3">Recent Reviews for {course.code}</div>
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div
                key={r.id}
                className="p-4 rounded-xl"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <Link
                    href={`/p/${r.professors?.slug}`}
                    className="text-sm font-semibold hover:underline truncate"
                    style={{ color: "var(--accent)" }}
                  >
                    {r.professors?.name_en}
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className="w-[40px] h-[40px] rounded-lg flex items-center justify-center"
                      style={{ background: qualityBg(r.rating_quality) }}
                    >
                      <span className="text-sm font-extrabold font-display" style={{ color: qualityColor(r.rating_quality) }}>
                        {Number(r.rating_quality).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {r.tags?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {r.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {r.comment && (
                  <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>
                    {r.comment}
                  </p>
                )}

                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {new Date(r.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
