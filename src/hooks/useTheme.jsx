import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { themes } from "../styles/theme";

const ThemeContext = createContext();

const STORAGE_KEY = "cleanfeed-theme";

function getInitialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  // Respect system preference
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);
  const theme = themes[mode];

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.style.background = theme.colors.bg;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
