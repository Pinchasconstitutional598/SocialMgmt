import { Add as AddIcon } from "@mui/icons-material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Button, Snackbar, TextField, Tooltip, Typography } from "@mui/material";
import { type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { AddClientDialog } from "../components/AddClientDialog";
import { ClientsTable } from "../components/clients/ClientsTable";
import { apiFetch, apiJson } from "../lib/api";

type Row = {
  id: number;
  name: string;
  email: string;
  industry: string | null;
  status: string;
  metaConnectionStatus: string;
  socialAccountsCount: number;
};

type ListResponse = {
  data: Row[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [snack, setSnack] = useState<string | null>(null);
  const [reauthLoadingId, setReauthLoadingId] = useState<number | null>(null);

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const oauthError = searchParams.get("oauth_error");
  useEffect(() => {
    if (oauthError) {
      setSnack(decodeURIComponent(oauthError));
      searchParams.delete("oauth_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [oauthError, searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchDebounced) q.set("search", searchDebounced);
      const res = await apiJson<ListResponse>(`/api/clients?${q.toString()}`);
      setRows(res.data);
      setRowCount(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const startReauthenticate = async (clientId: number) => {
    setReauthLoadingId(clientId);
    try {
      const res = await apiFetch("/api/auth/facebook/connect", {
        method: "POST",
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch (e) {
      setSnack(e instanceof Error ? e.message : "Nie udało się rozpocząć autoryzacji Facebook");
    } finally {
      setReauthLoadingId(null);
    }
  };

  const onPaginationModelChange = (model: GridPaginationModel) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String((model.page ?? 0) + 1));
    next.set("pageSize", String(model.pageSize ?? 25));
    setSearchParams(next);
  };

  const columns: GridColDef<Row>[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Nazwa", flex: 1, minWidth: 160 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
    { field: "industry", headerName: "Branża", width: 140 },
    { field: "status", headerName: "Status", width: 120 },
    {
      field: "metaConnectionStatus",
      headerName: "Status połączenia",
      sortable: false,
      minWidth: 220,
      flex: 0.5,
      renderCell: (params) => {
        const count = params.row.socialAccountsCount ?? 0;
        const mcs = params.row.metaConnectionStatus;
        if (count === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              Brak konta
            </Typography>
          );
        }
        if (mcs === "expired") {
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <Tooltip title="Token Meta wygasł lub jest nieprawidłowy — ponów autoryzację Facebook/Instagram.">
                <WarningAmberIcon sx={{ color: (t) => t.palette.error.main }} fontSize="small" />
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={reauthLoadingId === params.row.id}
                onClick={() => void startReauthenticate(params.row.id)}
              >
                Re-authenticate
              </Button>
            </Box>
          );
        }
        if (mcs === "connected") {
          return (
            <Tooltip title="Połączenie Meta aktywne (ostatni udany kontakt z API).">
              <CheckCircleOutlineIcon color="success" fontSize="small" />
            </Tooltip>
          );
        }
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button component={RouterLink} to={`/clients/${params.row.id}`} size="small">
          Profil
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}
      >
        <Typography variant="h5">Klienci</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Dodaj klienta
        </Button>
      </Box>
      <TextField
        label="Szukaj (nazwa, email, branża)"
        inputProps={{ "data-testid": "clients-search-input" }}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          const next = new URLSearchParams(searchParams);
          next.set("page", "1");
          setSearchParams(next);
        }}
        fullWidth
        sx={{ mb: 2, maxWidth: 480 }}
        size="small"
      />
      <ClientsTable<Row>
        rows={rows}
        columns={columns}
        rowCount={rowCount}
        loading={loading}
        paginationModel={{ page: page - 1, pageSize }}
        onPaginationModelChange={onPaginationModelChange}
      />
      <AddClientDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={() => void load()} />
      <Snackbar open={!!snack} autoHideDuration={8000} onClose={() => setSnack(null)} message={snack ?? ""} />
    </Box>
  );
}
