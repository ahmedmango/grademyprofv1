import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import HomeClient from "@/components/HomeClient";

export const revalidate = 120;

export default async function HomePage() {
  const supabase = createServerClient();

  const [uniResult, reviewCountResult] = await Promise.all([
    supabase.from("universities").select("*").eq("is_active", true).order("name_en"),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "live"),
  ]);

  const universities = uniResult.data || [];
  const totalReviews = reviewCountResult.count || 0;

  // Trending professors
  let topProfessors: any[] = [];
  const { data: mvData } = await supabase.from("mv_trending_professors" as any).select("*").limit(6);
  if (mvData && mvData.length > 0) {
    topProfessors = mvData;
  } else {
    const { data } = await supabase.from("aggregates_professor")
      .select("*, professors ( id, name_en, slug, departments ( name_en ), universities ( name_en, slug ) )")
      .order("review_count", { ascending: false }).limit(6);
    topProfessors = data || [];
  }

  // Recent reviews for social proof
  const { data: recentReviews } = await supabase.from("reviews")
    .select("id, rating_quality, comment, created_at, professors ( name_en, slug ), universities ( name_en )")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(5);

  // Count unique professors
  const { count: profCount } = await supabase.from("professors")
    .select("*", { count: "exact", head: true }).eq("is_active", true);

  return (
    <HomeClient
      universities={universities}
      topProfessors={topProfessors}
      recentReviews={recentReviews || []}
      totalReviews={totalReviews}
      totalUniversities={universities.length}
      totalProfessors={profCount || 0}
    />
  );
}
