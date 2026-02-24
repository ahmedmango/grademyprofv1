"use client";

import { useState, useEffect, useCallback } from "react";

type ParsedRow = {
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

type Summary = { total: number; created: number; skipped: number; errors: number };

const TEMPLATE_CSV = `name_en,name_ar,university,department
Dr. John Smith,,University of Bahrain,Computer Science
Dr. Ahmed Ali,د. أحمد علي,Bahrain Polytechnic,Engineering`;

export default function BulkImportPage() {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [universities, setUniversities] = useState<{ name: string; slug: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const authHeader = useCallback(() => {
    const email = sessionStorage.getItem("admin_email");
    const secret = sessionStorage.getItem("admin_secret");
    return `Bearer ${secret}:${email}`;
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/universities", { headers: { Authorization: authHeader() } });
      if (res.ok) {
        const data = await res.json();
        setUniversities((data.universities || []).map((u: any) => ({ name: u.name_en, slug: u.slug })));
      }
    })();
  }, [authHeader]);

  const parseCSV = (text: string) => {
    setParseError("");
    setResults(null);
    setSummary(null);
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

  const handleImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    setResults(null);
    setSummary(null);

    try {
      const res = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader() },
        body: JSON.stringify({ rows: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setSummary(data.summary);
      } else {
        setParseError(data.error || "Import failed");
      }
    } catch {
      setParseError("Connection failed");
    }
    setImporting(false);
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

  const reset = () => {
    setCsvText("");
    setParsed([]);
    setResults(null);
    setSummary(null);
    setParseError("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Bulk Import Professors</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a CSV to add professors across multiple universities at once</p>
        </div>
        <button onClick={downloadTemplate}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
          Download Template CSV
        </button>
      </div>

      {/* University reference */}
      {universities.length > 0 && (
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

      {/* Import Results */}
      {summary && (
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

          {/* Detailed results */}
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
      {!summary && (
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
                <button onClick={handleImport} disabled={importing}
                  className="px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition disabled:opacity-50">
                  {importing ? "Importing..." : `Import ${parsed.length} Professors`}
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
        </>
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
        <p className="text-xs text-gray-400 mt-3">Duplicates (same name + same university) are automatically skipped. University names are matched case-insensitively.</p>
      </div>
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
