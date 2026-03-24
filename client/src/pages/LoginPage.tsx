import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiJson } from "../lib/api";

export function LoginPage() {
  const { token, login, registerFirst } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsFirst, setNeedsFirst] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const b = await apiJson<{ needsFirstUser: boolean }>("/api/auth/bootstrap");
        setNeedsFirst(b.needsFirstUser);
      } catch {
        setNeedsFirst(false);
      }
    })();
  }, []);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async () => {
    setError(null);
    try {
      if (needsFirst && tab === 0) {
        await registerFirst(email, password);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd logowania");
    }
  };

  const showRegister = needsFirst === true;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom align="center">
          Social Management
        </Typography>
        {showRegister ? (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Pierwszy administrator" />
            <Tab label="Logowanie" />
          </Tabs>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ mb: 2 }}>
            Zaloguj się do panelu
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit(); }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
            inputProps={{ "data-testid": "login-email" }}
          />
          <TextField
            label="Hasło"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete={showRegister && tab === 0 ? "new-password" : "current-password"}
            inputProps={{ "data-testid": "login-password" }}
          />
          <Button type="submit" variant="contained" size="large" data-testid="login-submit">
            {showRegister && tab === 0 ? "Utwórz konto administratora" : "Zaloguj"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
