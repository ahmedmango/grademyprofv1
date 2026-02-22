import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProfessorGatedWrapper from "./ProfessorGatedWrapper";

export default async function ProfessorPage({ params }: { params: { professorSlug: string } }) {
  const supabase = createServerClient();

  const { data: prof } = await supabase
    .from("professors")
    .select(`id, name_en, name_ar, slug, photo_url,
      departments ( id, name_en ),
      universities ( id, name_en, slug ),
      aggregates_professor ( review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, top_tags ),
      professor_courses ( courses ( id, code, title_en, slug ) )`)
    .eq("slug", params.professorSlug)
    .eq("is_active", true)
    .single();

  if (!prof) return notFound();

  const agg = (prof as any).aggregates_professor || {
    review_count: 0, avg_quality: 0, avg_difficulty: 0,
    would_take_again_pct: 0, rating_dist: {}, tag_dist: {}, top_tags: []
  };
  const dept = (prof as any).departments;
  const uni = (prof as any).universities;
  const courses = ((prof as any).professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, grade_received, created_at, courses ( code )")
    .eq("professor_id", prof.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="pb-28">
      <div className="px-5 pt-4 flex items-center gap-3 mb-4">
        <Link href={uni ? `/u/${uni.slug}` : "/"} className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{uni?.name_en}</span>
      </div>

      <ProfessorGatedWrapper
        profName={prof.name_en} profSlug={prof.slug} profId={prof.id}
        deptName={dept?.name_en || ""} uniName={uni?.name_en || ""} uniSlug={uni?.slug || ""}
        avgQuality={Number(agg.avg_quality)} avgDifficulty={Number(agg.avg_difficulty)}
        wouldTakeAgainPct={Number(agg.would_take_again_pct)} reviewCount={agg.review_count || 0}
        ratingDist={agg.rating_dist || {}} topTags={agg.top_tags || []}
        tagDist={agg.tag_dist || {}} courses={courses} reviews={reviews || []}
      />
    </div>
  );
}
