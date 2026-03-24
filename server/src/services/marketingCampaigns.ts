import { metaGraphFetch } from "./metaApiFetch";
import { MetaApiError } from "./metaGraph";

const GRAPH_VERSION = process.env.GRAPH_API_VERSION ?? "v20.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function normalizeAdAccountId(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("act_")) return s;
  return `act_${s.replace(/^act_/, "")}`;
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const u = new URL(`${BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function graphJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await metaGraphFetch(url, init);
  const data = (await res.json()) as T & { error?: { message: string; code: number } };
  if (data && typeof data === "object" && "error" in data && data.error) {
    const e = data.error;
    throw new MetaApiError(e.message ?? "Marketing API error", e.code, res.status);
  }
  return data;
}

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
};

export async function listCampaigns(adAccountId: string, accessToken: string) {
  const id = normalizeAdAccountId(adAccountId);
  const fields = "id,name,status,effective_status,objective";
  const url = buildUrl(`/${id}/campaigns`, {
    fields,
    limit: 100,
    access_token: accessToken,
  });
  const out = await graphJson<{ data: CampaignRow[] }>(url);
  return out.data ?? [];
}

/** Aktywne w sensie biznesowym — do wyświetlenia; można filtrować po effective_status */
export async function listActiveCampaigns(adAccountId: string, accessToken: string) {
  const all = await listCampaigns(adAccountId, accessToken);
  return all.filter((c) => ["ACTIVE", "PAUSED", "PENDING_REVIEW", "WITH_ISSUES"].includes(c.effective_status));
}

export async function setCampaignStatus(campaignId: string, accessToken: string, status: "ACTIVE" | "PAUSED") {
  const url = buildUrl(`/${campaignId}`, { access_token: accessToken });
  const body = new URLSearchParams({ status });
  return graphJson<{ success?: boolean }>(url, { method: "POST", body });
}

export type DailySpendRow = { date: string; spend: number };

export type DatePresetInsights = "last_7d" | "last_14d" | "last_30d";

/**
 * Dzienne wydatki (account level) — Marketing API Insights.
 * @see https://developers.facebook.com/docs/marketing-api/insights
 */
export async function getAdAccountDailySpend(
  adAccountId: string,
  accessToken: string,
  datePreset: DatePresetInsights = "last_7d",
): Promise<DailySpendRow[]> {
  const id = normalizeAdAccountId(adAccountId);
  const first = buildUrl(`/${id}/insights`, {
    fields: "spend,date_start,date_stop",
    date_preset: datePreset,
    time_increment: 1,
    level: "account",
    access_token: accessToken,
  });

  const rows: DailySpendRow[] = [];
  let nextUrl: string | null = first;

  type InsightsPage = {
    data?: Array<{ spend?: string; date_start?: string }>;
    paging?: { next?: string };
  };

  while (nextUrl) {
    const chunk: InsightsPage = await graphJson<InsightsPage>(nextUrl);
    for (const row of chunk.data ?? []) {
      const date = row.date_start?.trim();
      if (!date) continue;
      const spend = parseFloat(row.spend ?? "0");
      rows.push({ date, spend: Number.isFinite(spend) ? spend : 0 });
    }
    nextUrl = chunk.paging?.next ?? null;
  }

  return rows;
}

/** @deprecated użyj {@link getAdAccountDailySpend} z presetem last_7d */
export async function getAdAccountDailySpendLast7Days(
  adAccountId: string,
  accessToken: string,
): Promise<DailySpendRow[]> {
  return getAdAccountDailySpend(adAccountId, accessToken, "last_7d");
}

export type CampaignCpcInsight = {
  campaignId: string;
  name: string;
  cpc: number;
  spend?: number;
  clicks?: number;
};

/**
 * Insights na poziomie kampanii — CPC (ostatnie 7 dni).
 */
export async function getCampaignCpcInsight(
  campaignId: string,
  accessToken: string,
): Promise<{ cpc?: number; spend?: number; clicks?: number }> {
  const url = buildUrl(`/${campaignId}/insights`, {
    fields: "cpc,cpm,clicks,spend",
    date_preset: "last_7d",
    access_token: accessToken,
  });
  const out = await graphJson<{
    data?: Array<{ cpc?: string; spend?: string; clicks?: string }>;
  }>(url);
  const row = out.data?.[0];
  return {
    cpc: row?.cpc != null ? parseFloat(row.cpc) : undefined,
    spend: row?.spend != null ? parseFloat(row.spend) : undefined,
    clicks: row?.clicks != null ? parseInt(row.clicks, 10) : undefined,
  };
}
