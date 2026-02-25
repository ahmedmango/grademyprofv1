import { createServerClient } from "@/lib/supabase/server";
import HomeClient from "@/components/HomeClient";

export const revalidate = 30;

export default async function HomePage() {
  const supabase = createServerClient();

  const [uniResult, reviewCountResult, trendingResult, recentResult, profCountResult] = await Promise.all([
    supabase.from("universities").select("*").eq("is_active", true).order("display_order", { ascending: true }).order("name_en"),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("mv_trending_professors" as any).select("*").limit(6),
    supabase.from("reviews")
      .select("id, rating_quality, comment, created_at, professors ( name_en, slug ), universities ( name_en )")
      .eq("status", "live").order("created_at", { ascending: false }).limit(5),
    supabase.from("professors").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const universities = uniResult.data || [];
  const totalReviews = reviewCountResult.count || 0;

  let topProfessors: any[] = trendingResult.data || [];
  if (topProfessors.length === 0) {
    const { data } = await supabase.from("aggregates_professor")
      .select("*, professors ( id, name_en, slug, departments ( name_en ), universities ( name_en, slug ) )")
      .order("review_count", { ascending: false }).limit(6);
    topProfessors = data || [];
  }

  const recentReviews = recentResult.data || [];
  const profCount = profCountResult.count || 0;

  return (
    <HomeClient
      universities={universities}
      topProfessors={topProfessors}
      recentReviews={recentReviews}
      totalReviews={totalReviews}
      totalUniversities={universities.length}
      totalProfessors={profCount}
    />
  );
}
