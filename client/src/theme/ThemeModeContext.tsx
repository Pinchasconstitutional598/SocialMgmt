/* eslint-disable react-refresh/only-export-components -- moduł kontekstu: Provider + hook useThemeMode */
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ThemeModeContextValue = { mode: PaletteMode; toggleMode: () => void };

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const STORAGE_KEY = "sm_theme_mode";

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode musi być użyte w ThemeModeProvider");
  }
  return ctx;
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const s = localStorage.getItem(STORAGE_KEY) as PaletteMode | null;
    return s === "dark" || s === "light" ? s : "light";
  });

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next: PaletteMode = m === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#1976d2" },
          secondary: { main: "#9c27b0" },
          ...(mode === "dark" ? { background: { default: "#0d1117", paper: "#161b22" } } : {}),
        },
      }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
