import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

type Row = {
  name_en: string;
  name_ar: string;
  university: string;
  department: string;
};

type Result = {
  row: number;
  name: string;
  university: string;
  status: "created" | "skipped" | "error";
  detail?: string;
};

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { rows } = body as { rows: Row[] };

  if (!rows?.length)
    return NextResponse.json({ error: "No rows provided" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();

  // Load all universities for matching
  const { data: allUnis } = await supabase.from("universities").select("id, name_en, slug");
  const uniMap = new Map<string, string>();
  for (const u of allUnis || []) {
    uniMap.set(u.name_en.toLowerCase().trim(), u.id);
    uniMap.set(u.slug.toLowerCase().trim(), u.id);
  }

  // Load all departments for matching
  const { data: allDepts } = await supabase.from("departments").select("id, name_en, university_id");
  const deptMap = new Map<string, string>();
  for (const d of allDepts || []) {
    deptMap.set(`${d.university_id}:${d.name_en.toLowerCase().trim()}`, d.id);
  }

  // Load existing professor slugs for dedup
  const { data: existingProfs } = await supabase.from("professors").select("slug, university_id");
  const existingSlugs = new Set((existingProfs || []).map((p) => `${p.university_id}:${p.slug}`));

  const results: Result[] = [];
  const toInsert: {
    name_en: string;
    name_ar: string | null;
    slug: string;
    university_id: string;
    department_id: string | null;
    is_active: boolean;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.name_en || "").trim();

    if (!name) {
      results.push({ row: i + 1, name: "(empty)", university: row.university || "", status: "error", detail: "Missing name" });
      continue;
    }

    const uniKey = (row.university || "").toLowerCase().trim();
    const universityId = uniMap.get(uniKey);
    if (!universityId) {
      results.push({ row: i + 1, name, university: row.university || "", status: "error", detail: `University "${row.university}" not found` });
      continue;
    }

    const slug = slugify(name);
    const dedupKey = `${universityId}:${slug}`;

    if (existingSlugs.has(dedupKey)) {
      results.push({ row: i + 1, name, university: row.university, status: "skipped", detail: "Already exists" });
      continue;
    }

    let departmentId: string | null = null;
    if (row.department?.trim()) {
      const deptKey = `${universityId}:${row.department.toLowerCase().trim()}`;
      departmentId = deptMap.get(deptKey) || null;
    }

    existingSlugs.add(dedupKey);
    toInsert.push({
      name_en: name,
      name_ar: row.name_ar?.trim() || null,
      slug,
      university_id: universityId,
      department_id: departmentId,
      is_active: true,
    });
    results.push({ row: i + 1, name, university: row.university, status: "created" });
  }

  // Batch insert in chunks of 50
  let insertErrors = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error } = await supabase.from("professors").insert(chunk);
    if (error) {
      console.error("Bulk insert error:", error);
      insertErrors++;
      // Mark affected results as errors
      for (let j = i; j < i + chunk.length; j++) {
        const match = results.find((r) => r.status === "created" && r.name === toInsert[j].name_en);
        if (match) { match.status = "error"; match.detail = error.message; }
      }
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    summary: { total: rows.length, created, skipped, errors },
    results,
  }, { headers: NO_STORE_HEADERS });
}
