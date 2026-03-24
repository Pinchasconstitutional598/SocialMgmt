import { Alert, Box, Switch, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api";

type Campaign = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
};

type Props = {
  clientId: string;
  onMetaAuthRequired: (msg: string) => void;
};

export function ClientAdsTab({ clientId, onMetaAuthRequired }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ campaigns: Campaign[]; hint?: string }>(`/api/clients/${clientId}/meta/campaigns`);
      setCampaigns(data.campaigns);
      setHint(data.hint ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, onMetaAuthRequired]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (c: Campaign, nextOn: boolean) => {
    const nextStatus = nextOn ? "ACTIVE" : "PAUSED";
    setBusyId(c.id);
    try {
      await apiJson(`/api/clients/${clientId}/meta/campaigns/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Typography>Ładowanie kampanii…</Typography>;
  }

  const activeStatuses = ["ACTIVE", "PAUSED"];

  return (
    <Box>
      {hint && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {hint}
        </Alert>
      )}
      {campaigns.length === 0 ? (
        <Typography color="text.secondary">
          Brak kampanii do wyświetlenia (sprawdź konto reklamowe i uprawnienia Marketing API).
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nazwa</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Efektywny</TableCell>
              <TableCell align="right">Aktywna (włącz / wyłącz)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((c) => {
              const canToggle = activeStatuses.includes(c.effective_status);
              const isOn = c.effective_status === "ACTIVE";
              return (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell>{c.effective_status}</TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={isOn}
                      disabled={!canToggle || busyId === c.id}
                      onChange={(_, checked) => void toggle(c, checked)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
