import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.bh";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  const [professorsResult, universitiesResult] = await Promise.all([
    supabase.from("professors").select("slug").eq("is_active", true),
    supabase.from("universities").select("slug").eq("is_active", true),
  ]);

  const professorEntries: MetadataRoute.Sitemap = (professorsResult.data || []).map((p) => ({
    url: `${APP_URL}/p/${p.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const universityEntries: MetadataRoute.Sitemap = (universitiesResult.data || []).map((u) => ({
    url: `${APP_URL}/u/${u.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${APP_URL}/search`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${APP_URL}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${APP_URL}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];

  return [...staticPages, ...universityEntries, ...professorEntries];
}
