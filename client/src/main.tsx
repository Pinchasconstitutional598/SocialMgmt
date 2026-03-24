import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App.tsx";
import { ThemeModeProvider } from "./theme/ThemeModeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeModeProvider>
          <App />
        </ThemeModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
