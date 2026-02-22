import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import UniClientContent from "./UniClientContent";

export default async function UniversityPage({ params }: { params: { universitySlug: string } }) {
  const supabase = createServerClient();

  const { data: uni } = await supabase
    .from("universities")
    .select("*")
    .eq("slug", params.universitySlug)
    .eq("is_active", true)
    .single();

  if (!uni) return notFound();

  const { data: professors } = await supabase
    .from("professors")
    .select("id, name_en, slug, departments ( name_en ), aggregates_professor ( avg_quality, avg_difficulty, review_count, top_tags )")
    .eq("university_id", uni.id).eq("is_active", true).order("name_en");

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-5">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
      </div>

      <div className="mb-5">
        <h1 className="font-display text-xl font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
          {uni.short_name || uni.name_en}
        </h1>
        {uni.short_name && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{uni.name_en}</p>
        )}
      </div>

      <UniClientContent
        uniId={uni.id}
        uniName={uni.name_en}
        uniShortName={uni.short_name}
        uniSlug={uni.slug}
        professors={professors || []}
      />
    </div>
  );
}
