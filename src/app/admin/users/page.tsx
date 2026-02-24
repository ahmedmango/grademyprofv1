"use client";

import { useState, useEffect, useCallback } from "react";

type UserRow = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  is_banned: boolean;
  review_count: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const authHeader = useCallback(() => {
    const email = sessionStorage.getItem("admin_email");
    const secret = sessionStorage.getItem("admin_secret");
    return `Bearer ${secret}:${email}`;
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: authHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
      setLoading(false);
    })();
  }, [authHeader]);

  const exportCSV = async () => {
    const email = sessionStorage.getItem("admin_email");
    const secret = sessionStorage.getItem("admin_secret");
    const res = await fetch("/api/admin/users?format=csv", {
      headers: { Authorization: `Bearer ${secret}:${email}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gmp-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 text-gray-400">Loading users...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} registered users</p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition"
        >
          Export CSV
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username or email..."
        className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 text-sm focus:outline-none focus:border-brand-500"
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Reviews</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-brand-900">{u.username}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-brand-50 text-brand-500">
                    {u.review_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.is_banned ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Banned</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">Active</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  {search ? "No users match your search" : "No users yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
