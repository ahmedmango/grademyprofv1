"use client";

import { useState, useEffect, useCallback } from "react";

type Entity = Record<string, any>;

export default function EntitiesPage() {
  const [activeTab, setActiveTab] = useState<"universities" | "departments" | "professors" | "courses">("universities");
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Entity | null>(null);
  const [universities, setUniversities] = useState<Entity[]>([]);
  const [departments, setDepartments] = useState<Entity[]>([]);

  const authHeader = useCallback(() => {
    const email = sessionStorage.getItem("admin_email");
    const secret = sessionStorage.getItem("admin_secret");
    return `Bearer ${secret}:${email}`;
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/${activeTab}`, {
      headers: { Authorization: authHeader() },
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data[activeTab] || []);
    }
    setLoading(false);
  }, [activeTab, authHeader]);

  const fetchLookups = useCallback(async () => {
    const [uniRes, deptRes] = await Promise.all([
      fetch("/api/admin/universities", { headers: { Authorization: authHeader() } }),
      fetch("/api/admin/departments", { headers: { Authorization: authHeader() } }),
    ]);
    if (uniRes.ok) setUniversities((await uniRes.json()).universities || []);
    if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
  }, [authHeader]);

  useEffect(() => { fetchItems(); fetchLookups(); }, [fetchItems, fetchLookups]);

  const handleSave = async (formData: Entity) => {
    const method = editItem ? "PUT" : "POST";
    const body = editItem ? { id: editItem.id, ...formData } : formData;

    await fetch(`/api/admin/${activeTab}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify(body),
    });
    setShowForm(false);
    setEditItem(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete all related data.")) return;
    await fetch(`/api/admin/${activeTab}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ id }),
    });
    fetchItems();
  };

  const tabs = [
    { key: "universities", label: "Universities" },
    { key: "departments", label: "Departments" },
    { key: "professors", label: "Professors" },
    { key: "courses", label: "Courses" },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Manage Entities</h1>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition"
        >
          + Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key}
            onClick={() => { setActiveTab(t.key); setShowForm(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === t.key ? "bg-brand-500 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <EntityForm
          type={activeTab}
          item={editItem}
          universities={universities}
          departments={departments}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                {(activeTab !== "universities") && <th className="text-left px-4 py-3 font-medium text-gray-500">University</th>}
                {activeTab === "courses" && <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name_en || item.title_en || item.code}</td>
                  {activeTab !== "universities" && <td className="px-4 py-3 text-gray-500">{item.universities?.name_en || "—"}</td>}
                  {activeTab === "courses" && <td className="px-4 py-3 text-brand-500 font-medium">{item.code}</td>}
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{item.slug}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditItem(item); setShowForm(true); }}
                      className="text-brand-500 hover:underline text-xs mr-3"
                    >Edit</button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:underline text-xs"
                    >Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No {activeTab} found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EntityForm({
  type, item, universities, departments, onSave, onCancel,
}: {
  type: string; item: Entity | null; universities: Entity[]; departments: Entity[];
  onSave: (data: Entity) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Entity>(item || {});
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="bg-white rounded-xl border border-brand-200 p-5 mb-6">
      <h3 className="font-semibold text-brand-900 mb-4">
        {item ? "Edit" : "Add"} {type.slice(0, -1)}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {type === "universities" && (
          <>
            <Input label="Name (English)" value={form.name_en || ""} onChange={(v) => set("name_en", v)} />
            <Input label="Name (Arabic)" value={form.name_ar || ""} onChange={(v) => set("name_ar", v)} />
            <Input label="Country" value={form.country || "BH"} onChange={(v) => set("country", v)} />
          </>
        )}
        {type === "departments" && (
          <>
            <Input label="Name (English)" value={form.name_en || ""} onChange={(v) => set("name_en", v)} />
            <Input label="Name (Arabic)" value={form.name_ar || ""} onChange={(v) => set("name_ar", v)} />
            <Select label="University" value={form.university_id || ""} onChange={(v) => set("university_id", v)}
              options={universities.map((u) => ({ value: u.id, label: u.name_en }))} />
          </>
        )}
        {type === "professors" && (
          <>
            <Input label="Name (English)" value={form.name_en || ""} onChange={(v) => set("name_en", v)} />
            <Input label="Name (Arabic)" value={form.name_ar || ""} onChange={(v) => set("name_ar", v)} />
            <Select label="University" value={form.university_id || ""} onChange={(v) => set("university_id", v)}
              options={universities.map((u) => ({ value: u.id, label: u.name_en }))} />
            <Select label="Department" value={form.department_id || ""} onChange={(v) => set("department_id", v)}
              options={departments.filter((d) => !form.university_id || d.university_id === form.university_id).map((d) => ({ value: d.id, label: d.name_en }))} />
          </>
        )}
        {type === "courses" && (
          <>
            <Input label="Code (e.g. CS 301)" value={form.code || ""} onChange={(v) => set("code", v)} />
            <Input label="Title (English)" value={form.title_en || ""} onChange={(v) => set("title_en", v)} />
            <Input label="Title (Arabic)" value={form.title_ar || ""} onChange={(v) => set("title_ar", v)} />
            <Select label="University" value={form.university_id || ""} onChange={(v) => set("university_id", v)}
              options={universities.map((u) => ({ value: u.id, label: u.name_en }))} />
            <Select label="Department" value={form.department_id || ""} onChange={(v) => set("department_id", v)}
              options={departments.filter((d) => !form.university_id || d.university_id === form.university_id).map((d) => ({ value: d.id, label: d.name_en }))} />
          </>
        )}
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={() => onSave(form)}
          className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition">
          {item ? "Update" : "Create"}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white">
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
