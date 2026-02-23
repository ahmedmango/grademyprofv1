"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  accepted_terms: boolean;
  anon_user_hash?: string;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

const STORAGE_KEY = "gmp_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user)); } catch {}
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Connection failed" };
    }
  };

  const register = async (regData: RegisterData) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", ...regData }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user)); } catch {}
        return { success: true };
      }
      return { success: false, error: data.error || "Registration failed" };
    } catch {
      return { success: false, error: "Connection failed" };
    }
  };

  const logout = () => {
    setUser(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <UserContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
}
