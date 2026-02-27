"use client";

import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) setAuthed(true);
  }, []);

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, secret }),
      });
      if (res.ok) {
        const { token } = await res.json();
        sessionStorage.setItem("admin_token", token);
        setAuthed(true);
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Connection failed");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border border-gray-100">
          <h1 className="text-xl font-bold text-brand-900 mb-1">Admin Login</h1>
          <p className="text-sm text-gray-500 mb-6">GradeMyProfessor Moderation</p>
          <input
            type="email" placeholder="admin@grademyprofessor.bh" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-3 text-sm focus:outline-none focus:border-brand-500"
          />
          <input
            type="password" placeholder="Admin secret" value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 text-sm focus:outline-none focus:border-brand-500"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 transition"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2 sm:mb-0">
          <span className="font-bold text-brand-600 text-sm">GMP Admin</span>
          <button
            onClick={() => { sessionStorage.removeItem("admin_token"); setAuthed(false); }}
            className="text-sm text-gray-400 hover:text-red-500"
          >
            Logout
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 sm:gap-4 sm:mt-1">
          {[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/moderation", label: "Moderation" },
            { href: "/admin/bulk-import", label: "Import" },
            { href: "/admin/users", label: "Users" },
            { href: "/admin/entities", label: "Manage" },
          ].map((link) => (
            <a key={link.href} href={link.href}
              className="text-xs sm:text-sm text-gray-600 hover:text-brand-500 whitespace-nowrap px-2 py-1.5 rounded-lg hover:bg-gray-50 shrink-0">
              {link.label}
            </a>
          ))}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
