import { Alert, Box, Paper, Typography } from "@mui/material";
import { type ComponentType, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiJson } from "../lib/api";

type Point = { date: string; spend: number; label: string };

type OverviewResponse = {
  series: Point[];
  totalSpend: number;
  accountsScanned: number;
  errors: string[];
};

/* Recharts 2.x — typy JSX nie są w pełni zgodne z React 19 (TS2786). */
const Chart = BarChart as unknown as ComponentType<Record<string, unknown>>;
const AxisX = XAxis as unknown as ComponentType<Record<string, unknown>>;
const AxisY = YAxis as unknown as ComponentType<Record<string, unknown>>;
const Tip = Tooltip as unknown as ComponentType<Record<string, unknown>>;
const Grid = CartesianGrid as unknown as ComponentType<Record<string, unknown>>;
const BarEl = Bar as unknown as ComponentType<Record<string, unknown>>;
const Container = ResponsiveContainer as unknown as ComponentType<Record<string, unknown>>;

export function AdSpendOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiJson<OverviewResponse>("/api/marketing/ad-spend-overview");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Nie udało się pobrać danych");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Ad Spend Overview
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Sumaryczny wydatek z ostatnich 7 dni (Marketing API) dla wszystkich kont reklamowych ze statusem „active” w bazie.
        Kwoty są w walucie konta Meta (nieznormalizowane).
      </Typography>

      {loading && <Typography>Ładowanie…</Typography>}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data && (
        <>
          {data.errors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {data.errors.map((msg, i) => (
                <Typography key={i} variant="body2" component="div">
                  {msg}
                </Typography>
              ))}
            </Alert>
          )}

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Łącznie (ostatnie 7 dni)
            </Typography>
            <Typography variant="h4" component="p">
              {data.totalSpend.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Przetworzono kont w bazie (active): {data.accountsScanned}
            </Typography>
          </Paper>

          {data.series.length === 0 ? (
            <Typography color="text.secondary">Brak danych wydatków do wyświetlenia.</Typography>
          ) : (
            <Paper sx={{ p: 2, width: "100%", height: 400 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Wydatek wg dnia (suma ze wszystkich kont)
              </Typography>
              <Container width="100%" height="100%">
                <Chart data={data.series} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <Grid strokeDasharray="3 3" />
                  <AxisX dataKey="label" tick={{ fontSize: 12 }} />
                  <AxisY
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: number) =>
                      typeof v === "number" ? v.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) : String(v)
                    }
                  />
                  <Tip
                    formatter={(value: number | string) => [
                      typeof value === "number"
                        ? value.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : value,
                      "Wydatek",
                    ]}
                    labelFormatter={(label: string) => `Dzień: ${label}`}
                  />
                  <BarEl dataKey="spend" fill="#1976d2" name="Wydatek" radius={[4, 4, 0, 0]} />
                </Chart>
              </Container>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
