"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { GateProvider } from "./ReviewGate";

type Theme = "light" | "dark" | "system";

interface AppContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  resolvedTheme: "light" | "dark";
}

const AppContext = createContext<AppContextType>({
  theme: "light",
  setTheme: () => {},
  lang: "en",
  setLang: () => {},
  resolvedTheme: "light",
});

export function useApp() {
  return useContext(AppContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("en");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("gmp_theme") as Theme;
      const savedLang = localStorage.getItem("gmp_lang") as Lang;
      if (savedTheme) setThemeState(savedTheme);
      if (savedLang) setLangState(savedLang);
    } catch {}
  }, []);

  useEffect(() => {
    const apply = () => {
      let resolved: "light" | "dark" = "light";
      if (theme === "dark") resolved = "dark";
      else if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.documentElement.classList.toggle("dark", resolved === "dark");
      setResolvedTheme(resolved);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") apply(); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("gmp_theme", t); } catch {}
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("gmp_lang", l); } catch {}
  };

  return (
    <AppContext.Provider value={{ theme, setTheme, lang, setLang, resolvedTheme }}>
      <GateProvider>{children}</GateProvider>
    </AppContext.Provider>
  );
}
