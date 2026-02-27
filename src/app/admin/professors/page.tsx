"use client";

import { useState, useEffect, useCallback } from "react";

type Professor = {
  id: string;
  name_en: string;
  name_ar: string | null;
  slug: string;
  university_id: string;
  department_id: string | null;
  is_active: boolean;
  review_count: number;
  departments: { name_en: string } | null;
  universities: { name_en: string } | null;
};

type University = { id: string; name_en: string; slug: string };
type Department = { id: string; name_en: string; university_id: string };

const TITLE_RE = /^(dr\.?|prof\.?|professor|asst\.?|assoc\.?|engr\.?|mr\.?|mrs\.?|ms\.?|mx\.?|ir\.?)\s+/i;
function normName(n: string) {
  return n.trim().replace(TITLE_RE, "").replace(/\./g, "").replace(/\s+/g, " ").toLowerCase();
}

export default function ProfessorsPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUniId, setSelectedUniId] = useState<string>("");
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name_en: string; name_ar: string; department_id: string }>({ name_en: "", name_ar: "", department_id: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const authHeader = useCallback(() => `Bearer ${sessionStorage.getItem("admin_token") ?? ""}`, []);

  useEffect(() => {
    (async () => {
      const [uniRes, deptRes] = await Promise.all([
        fetch("/api/admin/universities", { headers: { Authorization: authHeader() } }),
        fetch("/api/admin/departments", { headers: { Authorization: authHeader() } }),
      ]);
      if (uniRes.ok) setUniversities((await uniRes.json()).universities || []);
      if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
    })();
  }, [authHeader]);

  const loadProfessors = useCallback(async (uniId: string) => {
    if (!uniId) { setProfessors([]); return; }
    setLoading(true);
    const res = await fetch(`/api/admin/professors?university_id=${uniId}`, { headers: { Authorization: authHeader() } });
    if (res.ok) setProfessors((await res.json()).professors || []);
    setLoading(false);
  }, [authHeader]);

  const handleUniChange = (uniId: string) => {
    setSelectedUniId(uniId);
    setEditId(null);
    setSearch("");
    loadProfessors(uniId);
  };

  const startEdit = (p: Professor) => {
    setEditId(p.id);
    setEditData({ name_en: p.name_en, name_ar: p.name_ar || "", department_id: p.department_id || "" });
  };

  const cancelEdit = () => { setEditId(null); };

  // Detect potential duplicate for the name being edited
  const getDupWarning = (currentId: string, newName: string): string | null => {
    if (!newName.trim()) return null;
    const key = normName(newName);
    const match = professors.find((p) => p.id !== currentId && normName(p.name_en) === key);
    return match ? match.name_en : null;
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const res = await fetch("/api/admin/professors", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ id, name_en: editData.name_en, name_ar: editData.name_ar || null, department_id: editData.department_id || null }),
    });
    if (res.ok) {
      const { professor } = await res.json();
      setProfessors((prev) => prev.map((p) => p.id === id ? { ...p, ...professor } : p));
      setEditId(null);
    } else {
      const d = await res.json();
      alert(d.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (p: Professor) => {
    const msg = p.review_count > 0
      ? `"${p.name_en}" has ${p.review_count} review${p.review_count === 1 ? "" : "s"} and will be deactivated instead of deleted. Continue?`
      : `Delete "${p.name_en}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    setDeletingId(p.id);
    const res = await fetch("/api/admin/professors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ id: p.id }),
    });
    const d = await res.json();
    if (res.ok) {
      if (d.soft_deleted) {
        // Deactivated — update in list
        setProfessors((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, is_active: false } : pr));
      } else {
        // Hard deleted — remove from list
        setProfessors((prev) => prev.filter((pr) => pr.id !== p.id));
      }
    } else {
      alert(d.error || "Delete failed");
    }
    setDeletingId(null);
  };

  const toggleActive = async (p: Professor) => {
    const res = await fetch("/api/admin/professors", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    if (res.ok) {
      setProfessors((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, is_active: !pr.is_active } : pr));
    }
  };

  const exportCSV = () => {
    const uni = universities.find((u) => u.id === selectedUniId);
    if (!uni) return;
    const rows = [["name_en", "name_ar", "university", "department"]];
    for (const p of professors) {
      rows.push([p.name_en, p.name_ar || "", uni.name_en, p.departments?.name_en || ""]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `professors-${uni.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniDepts = departments.filter((d) => d.university_id === selectedUniId);
  const filtered = professors.filter((p) =>
    !search || p.name_en.toLowerCase().includes(search.toLowerCase()) || (p.name_ar || "").includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Manage Professors</h1>
          <p className="text-sm text-gray-500 mt-1">View, edit, and export professors by university</p>
        </div>
        {selectedUniId && professors.length > 0 && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <span>⬇</span> Export CSV ({professors.length})
          </button>
        )}
      </div>

      {/* University selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select University</label>
        <select
          value={selectedUniId}
          onChange={(e) => handleUniChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500">
          <option value="">— Choose a university —</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>{u.name_en}</option>
          ))}
        </select>
      </div>

      {selectedUniId && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search professors…"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                />
                <span className="text-sm text-gray-400 shrink-0">{filtered.length} of {professors.length}</span>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  {professors.length === 0 ? "No professors found for this university." : "No results match your search."}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Arabic Name</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Department</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 w-20">Reviews</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 w-20">Active</th>
                        <th className="px-4 py-3 w-40"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((p) => {
                        const dupWarning = editId === p.id ? getDupWarning(p.id, editData.name_en) : null;
                        return (
                          <tr key={p.id} className={`hover:bg-gray-50/50 ${!p.is_active ? "opacity-50" : ""}`}>
                            {editId === p.id ? (
                              <>
                                <td className="px-4 py-2" colSpan={2}>
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <input
                                        value={editData.name_en}
                                        onChange={(e) => setEditData((d) => ({ ...d, name_en: e.target.value }))}
                                        className={`w-full px-2 py-1 border rounded-lg text-sm focus:outline-none focus:border-brand-500 ${dupWarning ? "border-amber-400 bg-amber-50" : "border-brand-300"}`}
                                        placeholder="English name"
                                      />
                                      {dupWarning && (
                                        <p className="text-[10px] text-amber-600 mt-0.5">⚠️ Possible duplicate of &ldquo;{dupWarning}&rdquo;</p>
                                      )}
                                    </div>
                                    <input
                                      value={editData.name_ar}
                                      onChange={(e) => setEditData((d) => ({ ...d, name_ar: e.target.value }))}
                                      className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                                      placeholder="Arabic name"
                                      dir="rtl"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <select
                                    value={editData.department_id}
                                    onChange={(e) => setEditData((d) => ({ ...d, department_id: e.target.value }))}
                                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
                                    <option value="">— No dept —</option>
                                    {uniDepts.map((d) => (
                                      <option key={d.id} value={d.id}>{d.name_en}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-2 text-center text-gray-400">{p.review_count}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-block w-2 h-2 rounded-full ${p.is_active ? "bg-green-400" : "bg-gray-300"}`} />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => saveEdit(p.id)}
                                      disabled={saving || !editData.name_en.trim()}
                                      className="text-xs px-2.5 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition">
                                      {saving ? "…" : "Save"}
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition">
                                      ✕
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                  <a href={`/p/${p.slug}`} target="_blank" className="hover:text-brand-500 transition">{p.name_en}</a>
                                </td>
                                <td className="px-4 py-3 text-gray-400 hidden md:table-cell" dir="rtl">{p.name_ar || "—"}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{p.departments?.name_en || <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-xs font-semibold ${p.review_count > 0 ? "text-brand-600" : "text-gray-300"}`}>{p.review_count}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => toggleActive(p)}
                                    title={p.is_active ? "Deactivate" : "Activate"}
                                    className={`inline-block w-8 h-4 rounded-full transition-colors ${p.is_active ? "bg-green-400" : "bg-gray-200"}`}>
                                    <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${p.is_active ? "translate-x-4" : "translate-x-0"}`} />
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => startEdit(p)}
                                      className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(p)}
                                      disabled={deletingId === p.id}
                                      className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                                      {deletingId === p.id ? "…" : "Delete"}
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!selectedUniId && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🏛</div>
          <p className="text-sm">Select a university to view and manage its professors</p>
        </div>
      )}
    </div>
  );
}
