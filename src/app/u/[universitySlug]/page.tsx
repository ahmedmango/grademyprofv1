import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtRating } from "@/lib/utils";

export default async function UniversityPage({ params }: { params: { universitySlug: string } }) {
  const supabase = createServerClient();

  const { data: uni } = await supabase
    .from("universities")
    .select("*")
    .eq("slug", params.universitySlug)
    .eq("is_active", true)
    .single();

  if (!uni) return notFound();

  const { data: departments } = await supabase
    .from("departments").select("*").eq("university_id", uni.id).order("name_en");

  const { data: professors } = await supabase
    .from("professors")
    .select("id, name_en, slug, departments ( name_en ), aggregates_professor ( avg_quality, review_count )")
    .eq("university_id", uni.id).eq("is_active", true).order("name_en");

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
        <span className="text-xs text-gray-400">Universities</span>
      </div>

      <h1 className="font-display text-2xl font-extrabold text-brand-600 mb-1">{uni.name_en}</h1>
      {uni.name_ar && <p className="text-sm text-gray-400 mb-6" dir="rtl">{uni.name_ar}</p>}

      {departments && departments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Departments</h2>
          <div className="flex flex-wrap gap-2">
            {departments.map((d: any) => (
              <span key={d.id} className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-1.5 text-xs text-brand-500 font-medium">{d.name_en}</span>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Professors</h2>
      <div className="space-y-2.5">
        {(professors || []).map((p: any) => {
          const agg = p.aggregates_professor;
          const avgQ = agg?.avg_quality || agg?.[0]?.avg_quality || 0;
          const count = agg?.review_count || agg?.[0]?.review_count || 0;
          const qc = avgQ >= 4 ? "text-green-600" : avgQ >= 3 ? "text-amber-600" : "text-red-600";
          return (
            <Link key={p.id} href={`/p/${p.slug}`}
              className="flex items-center justify-between bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 transition">
              <div>
                <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                <div className="text-xs text-gray-400">{p.departments?.name_en}</div>
              </div>
              {count > 0 && (
                <div className="text-right">
                  <div className={`text-lg font-extrabold font-display ${qc}`}>{Number(avgQ).toFixed(1)}</div>
                  <div className="text-[10px] text-gray-400">{count} ratings</div>
                </div>
              )}
            </Link>
          );
        })}
        {(!professors || professors.length === 0) && (
          <p className="text-center py-8 text-gray-400 text-sm">No professors added yet for this university.</p>
        )}
      </div>
    </div>
  );
}
