"use client";

import { useState, useEffect, useCallback } from "react";

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

type Result = {
  row: number;
  name: string;
  university: string;
  status: "created" | "skipped" | "error";
  detail?: string;
};

type Summary = { total: number; created: number; skipped: number; errors: number };
type ViewState = "upload" | "checking" | "review" | "importing" | "done";

const TEMPLATE_CSV = `name_en,name_ar,university,department
Dr. John Smith,,University of Bahrain,Computer Science
Dr. Ahmed Ali,د. أحمد علي,Bahrain Polytechnic,Engineering`;

export default function BulkImportPage() {
  const [view, setView] = useState<ViewState>("upload");
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [universities, setUniversities] = useState<{ name: string; slug: string }[]>([]);
  const [checked, setChecked] = useState<CheckedRow[]>([]);
  const [counts, setCounts] = useState<{ new: number; possible: number; exact: number; errors: number } | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showReady, setShowReady] = useState(false);

  const authHeader = useCallback(() => {
    return `Bearer ${sessionStorage.getItem("admin_token") ?? ""}`;
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/universities", { headers: { Authorization: authHeader() } });
      if (res.ok) {
        const data = await res.json();
        setUniversities((data.universities || []).map((u: { name_en: string; slug: string }) => ({ name: u.name_en, slug: u.slug })));
      }
    })();
  }, [authHeader]);

  const parseCSV = (text: string) => {
    setParseError("");
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) { setParseError("Need a header row + at least 1 data row"); setParsed([]); return; }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = header.findIndex((h) => h === "name_en" || h === "name" || h === "professor");
    const arIdx = header.findIndex((h) => h === "name_ar" || h === "arabic");
    const uniIdx = header.findIndex((h) => h === "university" || h === "uni" || h === "university_slug");
    const deptIdx = header.findIndex((h) => h === "department" || h === "dept");

    if (nameIdx === -1) { setParseError("CSV must have a 'name_en' (or 'name' or 'professor') column"); setParsed([]); return; }
    if (uniIdx === -1) { setParseError("CSV must have a 'university' column"); setParsed([]); return; }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const name = (cols[nameIdx] || "").trim();
      if (!name) continue;
      rows.push({
        name_en: name,
        name_ar: arIdx >= 0 ? (cols[arIdx] || "").trim() : "",
        university: (cols[uniIdx] || "").trim(),
        department: deptIdx >= 0 ? (cols[deptIdx] || "").trim() : "",
      });
    }
    setParsed(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleCheck = async () => {
    if (!parsed.length) return;
    setView("checking");
    try {
      const res = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader() },
        body: JSON.stringify({ action: "check", rows: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setChecked(data.checked);
        setCounts(data.counts);
        setExcluded(new Set());
        setShowReady(false);
        setView("review");
      } else {
        setParseError(data.error || "Check failed");
        setView("upload");
      }
    } catch {
      setParseError("Connection failed");
      setView("upload");
    }
  };

  const handleImport = async () => {
    const toImport = checked.filter((r) => r.category !== "error" && !excluded.has(r.index));
    if (!toImport.length) return;
    setView("importing");
    try {
      const res = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader() },
        body: JSON.stringify({
          action: "import",
          rows: toImport.map((r) => ({
            name_en: r.name_en,
            name_ar: r.name_ar,
            university: r.university,
            department: r.department,
            university_id: r.university_id,
            department_id: r.department_id,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setSummary(data.summary);
        setView("done");
      } else {
        setParseError(data.error || "Import failed");
        setView("review");
      }
    } catch {
      setParseError("Connection failed");
      setView("review");
    }
  };

  const reset = () => {
    setCsvText("");
    setParsed([]);
    setChecked([]);
    setCounts(null);
    setExcluded(new Set());
    setResults(null);
    setSummary(null);
    setParseError("");
    setShowReady(false);
    setView("upload");
  };

  const toggleExclude = (index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const removeAllDuplicates = () => {
    const dupIndexes = checked
      .filter((r) => r.category === "possible" || r.category === "exact")
      .map((r) => r.index);
    setExcluded(new Set(dupIndexes));
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "professors-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toImportCount = checked.filter((r) => r.category !== "error" && !excluded.has(r.index)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Bulk Import Professors</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a CSV to add professors across multiple universities at once</p>
        </div>
        {view === "upload" && (
          <button onClick={downloadTemplate}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
            Download Template CSV
          </button>
        )}
      </div>

      {/* University reference — only on upload */}
      {view === "upload" && universities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Universities (use these names in the CSV)</h3>
          <div className="flex flex-wrap gap-2">
            {universities.map((u) => (
              <span key={u.slug} className="px-2.5 py-1 bg-brand-50 text-brand-600 rounded-md text-xs font-medium">
                {u.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Checking spinner */}
      {view === "checking" && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Checking against database…</p>
          </div>
        </div>
      )}

      {/* Importing spinner */}
      {view === "importing" && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Importing…</p>
          </div>
        </div>
      )}

      {/* Review state */}
      {view === "review" && counts && (
        <div>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3 mb-5">
            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">✅ {counts.new} new</span>
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">⚠️ {counts.possible} possible</span>
            <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200">❌ {counts.exact} exact</span>
            {counts.errors > 0 && <span className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-sm font-medium border border-gray-200">🚫 {counts.errors} errors</span>}
          </div>

          {(counts.possible + counts.exact) > 0 && (
            <button onClick={removeAllDuplicates}
              className="mb-5 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition">
              Remove all duplicates ({counts.possible + counts.exact})
            </button>
          )}

          {/* Possible duplicates */}
          {checked.filter((r) => r.category === "possible").length > 0 && (
            <DupSection
              title="⚠️ Possible duplicates"
              rows={checked.filter((r) => r.category === "possible")}
              excluded={excluded}
              onToggle={toggleExclude}
              defaultOpen
            />
          )}

          {/* Exact duplicates */}
          {checked.filter((r) => r.category === "exact").length > 0 && (
            <DupSection
              title="❌ Exact duplicates"
              rows={checked.filter((r) => r.category === "exact")}
              excluded={excluded}
              onToggle={toggleExclude}
              defaultOpen
            />
          )}

          {/* Errors */}
          {checked.filter((r) => r.category === "error").length > 0 && (
            <ErrorSection rows={checked.filter((r) => r.category === "error")} />
          )}

          {/* Ready to import */}
          {checked.filter((r) => r.category === "new").length > 0 && (
            <ReadySection
              rows={checked.filter((r) => r.category === "new")}
              excluded={excluded}
              onToggle={toggleExclude}
              open={showReady}
              onToggleOpen={() => setShowReady((v) => !v)}
            />
          )}

          {parseError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{parseError}</div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-6">
            <button onClick={() => { setView("upload"); setParseError(""); }}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={toImportCount === 0}
              className="px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              Confirm &amp; Import ({toImportCount} professors) →
            </button>
          </div>
        </div>
      )}

      {/* Done state */}
      {view === "done" && summary && (
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl border p-4 bg-gray-50 border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{summary.total}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </div>
            <div className="rounded-xl border p-4 bg-green-50 border-green-200">
              <div className="text-2xl font-bold text-green-700">{summary.created}</div>
              <div className="text-xs text-green-600">Created</div>
            </div>
            <div className="rounded-xl border p-4 bg-amber-50 border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{summary.skipped}</div>
              <div className="text-xs text-amber-600">Skipped (duplicates)</div>
            </div>
            <div className="rounded-xl border p-4 bg-red-50 border-red-200">
              <div className="text-2xl font-bold text-red-700">{summary.errors}</div>
              <div className="text-xs text-red-600">Errors</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 w-12">#</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Professor</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">University</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results?.map((r, i) => (
                  <tr key={i} className={r.status === "error" ? "bg-red-50/50" : r.status === "skipped" ? "bg-amber-50/30" : ""}>
                    <td className="px-4 py-2 text-gray-400">{r.row}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-2 text-gray-500">{r.university}</td>
                    <td className="px-4 py-2">
                      {r.status === "created" && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Created</span>}
                      {r.status === "skipped" && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium" title={r.detail}>Skipped</span>}
                      {r.status === "error" && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium" title={r.detail}>{r.detail}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={reset} className="mt-4 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition">
            Import More
          </button>
        </div>
      )}

      {/* Upload area */}
      {view === "upload" && (
        <>
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 text-center mb-4">
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="text-3xl mb-2 text-gray-300">&#128196;</div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Drop a CSV file or <span className="text-brand-500 underline">click to browse</span>
              </p>
              <p className="text-xs text-gray-400">Columns: name_en, name_ar (optional), university, department (optional)</p>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Or paste CSV text directly</label>
            <textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); parseCSV(e.target.value); }}
              rows={6}
              placeholder={TEMPLATE_CSV}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-brand-500 resize-y"
            />
          </div>

          {parseError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{parseError}</div>
          )}

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Preview ({parsed.length} professors)</h3>
                <button onClick={handleCheck}
                  className="px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition">
                  Check for Duplicates →
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500 w-12">#</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Name (EN)</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Name (AR)</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">University</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsed.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-800">{r.name_en}</td>
                        <td className="px-4 py-2 text-gray-500" dir="rtl">{r.name_ar || "—"}</td>
                        <td className="px-4 py-2 text-gray-500">{r.university}</td>
                        <td className="px-4 py-2 text-gray-400">{r.department || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Help */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">CSV Format Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-600 mb-1">Required columns:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><code className="bg-white px-1 rounded">name_en</code> — Professor name in English</li>
                  <li><code className="bg-white px-1 rounded">university</code> — University name or slug</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-600 mb-1">Optional columns:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><code className="bg-white px-1 rounded">name_ar</code> — Arabic name</li>
                  <li><code className="bg-white px-1 rounded">department</code> — Department name (must match existing)</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Exact and possible duplicates are flagged before anything is written. University names are matched case-insensitively.</p>
          </div>
        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function DupSection({
  title,
  rows,
  excluded,
  onToggle,
  defaultOpen,
}: {
  title: string;
  rows: CheckedRow[];
  excluded: Set<number>;
  onToggle: (index: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        onClick={() => setOpen((v) => !v)}>
        <span>{title} ({rows.length})</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-t border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">University</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Conflicts with</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => {
                const isExcluded = excluded.has(r.index);
                return (
                  <tr key={r.index} className={isExcluded ? "opacity-50" : ""}>
                    <td className={`px-4 py-2 font-medium ${isExcluded ? "line-through text-gray-400" : "text-gray-800"}`}>{r.name_en}</td>
                    <td className="px-4 py-2 text-gray-500">{r.university}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{r.conflict_with || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onToggle(r.index)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${isExcluded
                          ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}>
                        {isExcluded ? "↩ Undo" : "✕ Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ErrorSection({ rows }: { rows: CheckedRow[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 bg-white rounded-xl border border-red-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 transition"
        onClick={() => setOpen((v) => !v)}>
        <span>🚫 Errors ({rows.length})</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-t border-b border-red-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-red-500">Name</th>
                <th className="text-left px-4 py-2 font-medium text-red-500">University</th>
                <th className="text-left px-4 py-2 font-medium text-red-500">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {rows.map((r) => (
                <tr key={r.index} className="bg-red-50/30">
                  <td className="px-4 py-2 font-medium text-gray-800">{r.name_en || "(empty)"}</td>
                  <td className="px-4 py-2 text-gray-500">{r.university}</td>
                  <td className="px-4 py-2 text-red-600 text-xs">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReadySection({
  rows,
  excluded,
  onToggle,
  open,
  onToggleOpen,
}: {
  rows: CheckedRow[];
  excluded: Set<number>;
  onToggle: (index: number) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const activeCount = rows.filter((r) => !excluded.has(r.index)).length;
  return (
    <div className="mb-4 bg-white rounded-xl border border-green-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50 transition"
        onClick={onToggleOpen}>
        <span>✅ Ready to import ({activeCount} of {rows.length})</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-50 border-t border-b border-green-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-green-600">Name (EN)</th>
                <th className="text-left px-4 py-2 font-medium text-green-600">Name (AR)</th>
                <th className="text-left px-4 py-2 font-medium text-green-600">University</th>
                <th className="text-left px-4 py-2 font-medium text-green-600">Department</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-50">
              {rows.map((r) => {
                const isExcluded = excluded.has(r.index);
                return (
                  <tr key={r.index} className={isExcluded ? "opacity-50" : ""}>
                    <td className={`px-4 py-2 font-medium ${isExcluded ? "line-through text-gray-400" : "text-gray-800"}`}>{r.name_en}</td>
                    <td className="px-4 py-2 text-gray-500" dir="rtl">{r.name_ar || "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{r.university}</td>
                    <td className="px-4 py-2 text-gray-400">{r.department || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onToggle(r.index)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${isExcluded
                          ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}>
                        {isExcluded ? "↩ Undo" : "✕ Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
