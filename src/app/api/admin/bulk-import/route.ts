import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import logger from "@/lib/logger";

type ParsedRow = {
  name_en: string;
  name_ar: string;
  university: string;
  department: string;
};

type CheckedRow = ParsedRow & {
  index: number;
  university_id: string | null;
  department_id: string | null;
  category: "new" | "possible" | "exact" | "error";
  conflict_with?: string;
  error?: string;
};

type Row = ParsedRow & {
  university_id?: string | null;
  department_id?: string | null;
};

type Result = {
  row: number;
  name: string;
  university: string;
  status: "created" | "skipped" | "error";
  detail?: string;
};

function normalizeExact(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePossible(name: string): string {
  return name.trim().replace(/\s+/g, " ").replace(/\./g, "").toLowerCase();
}

// Strips common academic title prefixes (Dr., Prof., Mr., etc.) for a broader possible-match check
const TITLE_PREFIX_RE = /^(dr\.?|prof\.?|professor|asst\.?|assoc\.?|engr\.?|mr\.?|mrs\.?|ms\.?|mx\.?|ir\.?|dato\.?|sir)\s+/i;
function normalizeStripped(name: string): string {
  const stripped = name.trim().replace(TITLE_PREFIX_RE, "");
  return stripped.replace(/\./g, "").replace(/\s+/g, " ").toLowerCase();
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { action, rows } = body as { action?: string; rows: Row[] };

  if (!rows?.length)
    return NextResponse.json({ error: "No rows provided" }, { status: 400, headers: NO_STORE_HEADERS });

  if (rows.length > 500)
    return NextResponse.json({ error: "Maximum 500 rows per import" }, { status: 400, headers: NO_STORE_HEADERS });

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

  if (action === "check") {
    // Load existing professors (name + university + slug) for duplicate detection
    const { data: existingProfs } = await supabase.from("professors").select("name_en, university_id, slug");

    // Build three maps per university: exact, possible (no periods), and stripped (no titles)
    const dbExact = new Map<string, Map<string, string>>(); // uniId → normalizedName → original name
    const dbPossible = new Map<string, Map<string, string>>();
    const dbStripped = new Map<string, Map<string, string>>(); // title-stripped for broader possible match
    // Global slug map for catching slug-level conflicts (DB has a global unique constraint on slug)
    const dbSlugs = new Map<string, string>(); // slug → name_en

    for (const p of existingProfs || []) {
      if (!p.university_id) continue;
      if (!dbExact.has(p.university_id)) dbExact.set(p.university_id, new Map());
      if (!dbPossible.has(p.university_id)) dbPossible.set(p.university_id, new Map());
      if (!dbStripped.has(p.university_id)) dbStripped.set(p.university_id, new Map());
      dbExact.get(p.university_id)!.set(normalizeExact(p.name_en), p.name_en);
      dbPossible.get(p.university_id)!.set(normalizePossible(p.name_en), p.name_en);
      dbStripped.get(p.university_id)!.set(normalizeStripped(p.name_en), p.name_en);
      if (p.slug) dbSlugs.set(p.slug, p.name_en);
    }

    const checked: CheckedRow[] = [];
    // Within-import tracking: only "new" rows seed these sets
    const importExact = new Map<string, Map<string, string>>();
    const importPossible = new Map<string, Map<string, string>>();
    const importStripped = new Map<string, Map<string, string>>();
    const importSlugs = new Map<string, string>(); // slug → name_en (global, like the DB constraint)

    const counts = { new: 0, possible: 0, exact: 0, errors: 0 };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name_en || "").trim();

      if (!name) {
        checked.push({ ...row, index: i, university_id: null, department_id: null, category: "error", error: "Missing name" });
        counts.errors++;
        continue;
      }

      const uniKey = (row.university || "").toLowerCase().trim();
      const universityId = uniMap.get(uniKey);
      if (!universityId) {
        checked.push({ ...row, index: i, university_id: null, department_id: null, category: "error", error: `University "${row.university}" not found` });
        counts.errors++;
        continue;
      }

      let departmentId: string | null = null;
      if (row.department?.trim()) {
        departmentId = deptMap.get(`${universityId}:${row.department.toLowerCase().trim()}`) || null;
      }

      const exactKey = normalizeExact(name);
      const possibleKey = normalizePossible(name);
      const strippedKey = normalizeStripped(name);
      const slug = slugify(name);

      // Check against DB exact name
      const dbExactForUni = dbExact.get(universityId);
      if (dbExactForUni?.has(exactKey)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "exact", conflict_with: dbExactForUni.get(exactKey) });
        counts.exact++;
        continue;
      }

      // Check against DB possible name (period-stripped)
      const dbPossibleForUni = dbPossible.get(universityId);
      if (dbPossibleForUni?.has(possibleKey)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "possible", conflict_with: dbPossibleForUni.get(possibleKey) });
        counts.possible++;
        continue;
      }

      // Check against DB title-stripped name (catches "Dr. Samya Bahram" vs "Samya Bahram")
      const dbStrippedForUni = dbStripped.get(universityId);
      if (dbStrippedForUni?.has(strippedKey)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "possible", conflict_with: dbStrippedForUni.get(strippedKey) });
        counts.possible++;
        continue;
      }

      // Check within-import exact name
      const importExactForUni = importExact.get(universityId);
      if (importExactForUni?.has(exactKey)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "exact", conflict_with: `${importExactForUni.get(exactKey)} (earlier row)` });
        counts.exact++;
        continue;
      }

      // Check within-import possible name
      const importPossibleForUni = importPossible.get(universityId);
      if (importPossibleForUni?.has(possibleKey)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "possible", conflict_with: `${importPossibleForUni.get(possibleKey)} (earlier row)` });
        counts.possible++;
        continue;
      }

      // Check within-import title-stripped name
      const importStrippedForUni = importStripped.get(universityId);
      if (importStrippedForUni?.has(strippedKey)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "possible", conflict_with: `${importStrippedForUni.get(strippedKey)} (earlier row)` });
        counts.possible++;
        continue;
      }

      // Check global slug collision (DB has a global UNIQUE constraint on slug)
      if (dbSlugs.has(slug)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "exact", conflict_with: `${dbSlugs.get(slug)} (slug conflict)` });
        counts.exact++;
        continue;
      }
      if (importSlugs.has(slug)) {
        checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "exact", conflict_with: `${importSlugs.get(slug)} (slug conflict, earlier row)` });
        counts.exact++;
        continue;
      }

      // New — seed within-import tracking
      if (!importExact.has(universityId)) importExact.set(universityId, new Map());
      if (!importPossible.has(universityId)) importPossible.set(universityId, new Map());
      if (!importStripped.has(universityId)) importStripped.set(universityId, new Map());
      importExact.get(universityId)!.set(exactKey, name);
      importPossible.get(universityId)!.set(possibleKey, name);
      importStripped.get(universityId)!.set(strippedKey, name);
      importSlugs.set(slug, name);

      checked.push({ ...row, index: i, university_id: universityId, department_id: departmentId, category: "new" });
      counts.new++;
    }

    return NextResponse.json({ checked, counts }, { headers: NO_STORE_HEADERS });
  }

  // Import action (default) — slug-based dedup as final safety net
  // DB has a global UNIQUE constraint on slug (professors_slug_key), so dedup globally
  const { data: existingProfs } = await supabase.from("professors").select("slug");
  const existingSlugs = new Set((existingProfs || []).map((p) => p.slug));

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

    // Use pre-resolved university_id if provided, otherwise resolve from map
    const universityId = row.university_id || uniMap.get((row.university || "").toLowerCase().trim());
    if (!universityId) {
      results.push({ row: i + 1, name, university: row.university || "", status: "error", detail: `University "${row.university}" not found` });
      continue;
    }

    const slug = slugify(name);

    if (existingSlugs.has(slug)) {
      results.push({ row: i + 1, name, university: row.university, status: "skipped", detail: "Already exists" });
      continue;
    }

    // Use pre-resolved department_id if university was pre-resolved, otherwise resolve from map
    let departmentId: string | null = null;
    if (row.university_id) {
      departmentId = row.department_id ?? null;
    } else if (row.department?.trim()) {
      departmentId = deptMap.get(`${universityId}:${row.department.toLowerCase().trim()}`) || null;
    }

    existingSlugs.add(slug);
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
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error } = await supabase.from("professors").insert(chunk);
    if (error) {
      logger.error("Bulk insert error:", error);
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
