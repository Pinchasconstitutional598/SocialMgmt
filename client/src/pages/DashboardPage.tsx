import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CampaignIcon from "@mui/icons-material/Campaign";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PeopleIcon from "@mui/icons-material/People";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { type ComponentType, useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch, apiJson } from "../lib/api";

type DashboardPayload = {
  cachedAt: string;
  summary: {
    clientsTotal: number;
    clientsTrendPercent: number | null;
    activeCampaignsTotal: number;
    totalSpend30d: number;
    connections: { ok: number; expired: number; unknown: number };
  };
  spend14d: Array<{ date: string; label: string; spend: number }>;
  postsByWeekday: Array<{ weekday: string; facebook: number; instagram: number }>;
  needsAttention: {
    expiredTokens: Array<{ clientId: number; clientName: string }>;
    highCpcCampaigns: Array<{
      campaignId: string;
      name: string;
      cpc: number;
      clientName: string;
      adAccountId: string;
    }>;
    recentComments: Array<{
      clientName: string;
      platform: string;
      text: string;
      possiblyNegative: boolean;
    }>;
  };
  topClients: Array<{ clientId: number; name: string; spend30d: number }>;
  errors: string[];
};

const LineChartC = LineChart as unknown as ComponentType<Record<string, unknown>>;
const BarChartC = BarChart as unknown as ComponentType<Record<string, unknown>>;
const AxisX = XAxis as unknown as ComponentType<Record<string, unknown>>;
const AxisY = YAxis as unknown as ComponentType<Record<string, unknown>>;
const Tip = Tooltip as unknown as ComponentType<Record<string, unknown>>;
const GridC = CartesianGrid as unknown as ComponentType<Record<string, unknown>>;
const BarEl = Bar as unknown as ComponentType<Record<string, unknown>>;
const LineEl = Line as unknown as ComponentType<Record<string, unknown>>;
const LegendC = Legend as unknown as ComponentType<Record<string, unknown>>;
const Container = ResponsiveContainer as unknown as ComponentType<Record<string, unknown>>;

export function DashboardPage() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary?.main ?? "#9c27b0";

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<DashboardPayload>("/api/stats/dashboard");
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania dashboardu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startReauth = async (clientId: number) => {
    const res = await apiFetch("/api/auth/facebook/connect", {
      method: "POST",
      body: JSON.stringify({ clientId }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      throw new Error(j.error ?? res.statusText);
    }
    const j = (await res.json()) as { url: string };
    window.location.href = j.url;
  };

  const trend = data?.summary.clientsTrendPercent;
  const trendUp = trend != null && trend >= 0;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="caption" color="text.secondary">
          {data?.cachedAt ? `Dane z cache: ${new Date(data.cachedAt).toLocaleString("pl-PL")}` : ""}
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data?.errors && data.errors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {data.errors.slice(0, 5).map((e, i) => (
            <Typography key={i} variant="body2" component="div">
              {e}
            </Typography>
          ))}
        </Alert>
      )}

      {data && (
        <>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              "& > *": { flex: "1 1 220px", minWidth: { xs: "100%", sm: "calc(50% - 8px)", md: "calc(25% - 12px)" } },
            }}
          >
            <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PeopleIcon color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Klienci
                    </Typography>
                  </Box>
                  <Typography variant="h4">{data.summary.clientsTotal}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                    {trend != null && (
                      <>
                        {trendUp ? (
                          <ArrowUpwardIcon fontSize="small" color="success" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" color="error" />
                        )}
                        <Typography
                          variant="body2"
                          color={trendUp ? "success.main" : "error.main"}
                        >
                          {trendUp ? "+" : ""}
                          {trend}% vs poprzedni miesiąc
                        </Typography>
                      </>
                    )}
                    {trend == null && (
                      <Typography variant="caption" color="text.secondary">
                        Brak danych trendu
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <CampaignIcon color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Aktywne kampanie
                    </Typography>
                  </Box>
                  <Typography variant="h4">{data.summary.activeCampaignsTotal}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Suma ze wszystkich kont Marketing API (ACTIVE)
                  </Typography>
                </CardContent>
              </Card>
            <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <MonetizationOnIcon color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Wydatek (30 dni)
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {data.summary.totalSpend30d.toLocaleString("pl-PL", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Waluta wg konta Meta
                  </Typography>
                </CardContent>
              </Card>
            <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <SettingsEthernetIcon color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Połączenia Meta
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`OK: ${data.summary.connections.ok}`}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<ErrorOutlineIcon />}
                      label={`Wygasłe: ${data.summary.connections.expired}`}
                      color={data.summary.connections.expired > 0 ? "error" : "default"}
                      size="small"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Nieznane: {data.summary.connections.unknown}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              "& > *": {
                flex: { xs: "1 1 100%", md: "1 1 0" },
                minWidth: 0,
              },
            }}
          >
            <Paper sx={{ p: 2, height: 420, flex: { xs: "1 1 100%", md: "2 1 0" },
                minWidth: { md: 0 },
              }}>
                <Typography variant="subtitle1" gutterBottom>
                  Wydatki reklamowe (14 dni)
                </Typography>
                {data.spend14d.length === 0 ? (
                  <Typography color="text.secondary">Brak danych wydatków.</Typography>
                ) : (
                  <Container width="100%" height="90%">
                    <LineChartC data={data.spend14d} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <GridC strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <AxisX dataKey="label" tick={{ fontSize: 11 }} />
                      <AxisY
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          typeof v === "number" ? v.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) : String(v)
                        }
                      />
                      <Tip contentStyle={{ backgroundColor: theme.palette.background.paper }} />
                      <LineEl
                        type="monotone"
                        dataKey="spend"
                        stroke={primary}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Wydatek"
                      />
                    </LineChartC>
                  </Container>
                )}
              </Paper>
            <Paper sx={{ p: 2, height: 420, overflow: "auto", flex: { xs: "1 1 100%", md: "1 1 0" }, minWidth: { md: 280 } }}>
                <Typography variant="subtitle1" gutterBottom>
                  Wymaga uwagi
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Tokeny, CPC, komentarze
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Wygasły token / OAuth
                </Typography>
                <List dense disablePadding>
                  {data.needsAttention.expiredTokens.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Brak
                    </Typography>
                  ) : (
                    data.needsAttention.expiredTokens.map((c) => (
                      <ListItem key={c.clientId} disableGutters secondaryAction={
                        <Button size="small" onClick={() => void startReauth(c.clientId)}>
                          Napraw
                        </Button>
                      }>
                        <ListItemText primary={c.clientName} secondary={`ID ${c.clientId}`} />
                      </ListItem>
                    ))
                  )}
                </List>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  Wysoki CPC (kampanie)
                </Typography>
                <List dense disablePadding>
                  {data.needsAttention.highCpcCampaigns.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Brak
                    </Typography>
                  ) : (
                    data.needsAttention.highCpcCampaigns.map((c) => (
                      <ListItem key={c.campaignId} disablePadding>
                        <ListItemText
                          primary={c.name}
                          secondary={`${c.clientName} · CPC ${c.cpc.toFixed(2)}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Ostatnie komentarze
                </Typography>
                <List dense disablePadding>
                  {data.needsAttention.recentComments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Brak
                    </Typography>
                  ) : (
                    data.needsAttention.recentComments.map((c, i) => (
                      <ListItem key={i} disablePadding sx={{ alignItems: "flex-start" }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <span>{c.clientName}</span>
                              <Chip label={c.platform} size="small" variant="outlined" />
                              {c.possiblyNegative && <Chip label="Sentyment?" size="small" color="warning" />}
                            </Box>
                          }
                          secondary={c.text}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </Paper>
          </Box>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Posty wg dnia tygodnia (ostatnie 7 dni, próbka kont)
            </Typography>
            {data.postsByWeekday.every((d) => d.facebook === 0 && d.instagram === 0) ? (
              <Typography color="text.secondary">Brak danych — sprawdź tokeny i konta społecznościowe.</Typography>
            ) : (
              <Container width="100%" height={320}>
                <BarChartC
                  data={data.postsByWeekday}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <GridC strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <AxisX dataKey="weekday" tick={{ fontSize: 12 }} />
                  <AxisY allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tip contentStyle={{ backgroundColor: theme.palette.background.paper }} />
                  <LegendC />
                  <BarEl dataKey="facebook" fill={primary} name="Facebook" radius={[4, 4, 0, 0]} />
                  <BarEl dataKey="instagram" fill={secondary} name="Instagram" radius={[4, 4, 0, 0]} />
                </BarChartC>
              </Container>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Top 5 klientów (wydatek 30 dni)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Klient</TableCell>
                  <TableCell align="right">Wydatek (30 dni)</TableCell>
                  <TableCell align="right">Profil</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography color="text.secondary">Brak danych wydatków per klient.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topClients.map((row) => (
                    <TableRow key={row.clientId}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="right">
                        {row.spend30d.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        <Button component={RouterLink} to={`/clients/${row.clientId}`} size="small">
                          Otwórz
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
