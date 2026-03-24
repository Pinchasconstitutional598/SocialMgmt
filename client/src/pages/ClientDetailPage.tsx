import { Box, Button, Paper, Snackbar, Tab, Tabs, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ClientAdsTab } from "../components/clients/ClientAdsTab";
import { ClientContentTab } from "../components/clients/ClientContentTab";
import { ClientSocialTab } from "../components/clients/ClientSocialTab";
import { apiJson } from "../lib/api";

type ClientDetail = {
  id: number;
  name: string;
  email: string;
  industry: string | null;
  status: string;
  socialAccounts: {
    id: number;
    platform: string;
    platformId: string;
    tokenExpiresAt: string | null;
  }[];
};

export function ClientDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const connected = searchParams.get("connected");

  const onMetaAuthRequired = useCallback((msg: string) => {
    setSnack(msg || "Token Meta wygasł. Ponów autoryzację Facebook/Instagram.");
  }, []);

  useEffect(() => {
    if (connected === "1") {
      setSnack("Połączono z Meta — konta zapisane.");
      searchParams.delete("connected");
      setSearchParams(searchParams, { replace: true });
    }
  }, [connected, searchParams, setSearchParams]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const c = await apiJson<ClientDetail>(`/api/clients/${id}`);
        setClient(c);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd");
      }
    })();
  }, [id]);

  if (error && !client) {
    return (
      <Typography color="error" sx={{ mb: 2 }}>
        {error}
      </Typography>
    );
  }

  if (!id || !client) {
    return <Typography>Ładowanie…</Typography>;
  }

  return (
    <Box>
      <Button component={Link} to="/clients" sx={{ mb: 2 }}>
        ← Lista klientów
      </Button>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          {client.name}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {client.email}
        </Typography>
        <Typography variant="body2">Branża: {client.industry ?? "—"}</Typography>
        <Typography variant="body2">Status: {client.status}</Typography>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="Social Media" />
          <Tab label="Reklamy (Marketing API)" />
          <Tab label="Content Manager" data-testid="client-tab-content-manager" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 3 }}>
        {tab === 0 && <ClientSocialTab clientId={id} onMetaAuthRequired={onMetaAuthRequired} />}
        {tab === 1 && <ClientAdsTab clientId={id} onMetaAuthRequired={onMetaAuthRequired} />}
        {tab === 2 && <ClientContentTab clientId={id} onMetaAuthRequired={onMetaAuthRequired} />}
      </Paper>

      <Snackbar
        open={!!snack}
        autoHideDuration={8000}
        onClose={() => setSnack(null)}
        message={snack ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
