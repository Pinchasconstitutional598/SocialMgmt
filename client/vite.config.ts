import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Rolldown (Vite 8) + MUI: jedna instancja Emotion, poprawne re-eksporty `css` / `keyframes`
    dedupe: ["@emotion/react", "@emotion/styled", "@emotion/cache"],
  },
  optimizeDeps: {
    include: ["@emotion/react", "@emotion/styled", "@mui/material", "@mui/system", "@mui/x-data-grid"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
