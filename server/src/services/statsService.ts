import { prisma } from "../lib/prisma";
import {
  getAdAccountDailySpend,
  getCampaignCpcInsight,
  listCampaigns,
  type CampaignRow,
} from "./marketingCampaigns";
import { getInstagramMedia, getObjectComments, getPageFeed, MetaApiError } from "./metaGraph";

const CACHE_TTL_MS = 5 * 60 * 1000;
/** CPC powyżej tej wartości (waluta konta) traktujemy jako ostrzeżenie */
const HIGH_CPC_THRESHOLD = 3.5;
const MIN_CLICKS_FOR_CPC = 5;
const MAX_CAMPAIGNS_CPC_CHECK = 15;
const MAX_CLIENTS_FOR_COMMENTS = 5;

export type StatsSummary = {
  clientsTotal: number;
  /** vs poprzedni miesiąc (nowi klienci wg createdAt); null jeśli brak bazy porównawczej */
  clientsTrendPercent: number | null;
  activeCampaignsTotal: number;
  totalSpend30d: number;
  connections: {
    /** metaConnectionStatus === connected */
    ok: number;
    expired: number;
    unknown: number;
  };
};

export type DashboardPayload = {
  cachedAt: string;
  summary: StatsSummary;
  spend14d: Array<{ date: string; label: string; spend: number }>;
  /** Indeks 0 = niedziela … 6 = sobota (getDay) — zgodnie z etykietami */
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

let cache: { payload: DashboardPayload; expires: number } | null = null;

function facebookToken(socialAccounts: { platform: string; accessToken: string | null }[]): string | null {
  return socialAccounts.find((s) => s.platform === "facebook" && s.accessToken)?.accessToken ?? null;
}

function igToken(socialAccounts: { platform: string; accessToken: string | null }[]): string | null {
  return socialAccounts.find((s) => s.platform === "instagram" && s.accessToken)?.accessToken ?? null;
}

function isActiveAdAccountStatus(status: string): boolean {
  return status.trim().toLowerCase() === "active";
}

function formatLabel(isoDate: string): string {
  const p = isoDate.split("-");
  if (p.length !== 3) return isoDate;
  return `${p[2]}.${p[1]}.${p[0]}`;
}

const WEEKDAY_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

const NEGATIVE_HINT = /(zły|kiepski|oszust|nienawidzę|skandal|oszustwo|horrible|scam|worst|refund|żądam|nie polecam)/i;

export async function getCachedDashboardPayload(): Promise<DashboardPayload> {
  if (cache && Date.now() < cache.expires) {
    return cache.payload;
  }
  const payload = await buildDashboardPayload();
  cache = { payload, expires: Date.now() + CACHE_TTL_MS };
  return payload;
}

export async function getCachedSummaryOnly(): Promise<StatsSummary & { cachedAt: string }> {
  const p = await getCachedDashboardPayload();
  return { ...p.summary, cachedAt: p.cachedAt };
}

async function buildDashboardPayload(): Promise<DashboardPayload> {
  const errors: string[] = [];
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth = startThisMonth;

  const [
    clientsTotal,
    createdThisMonth,
    createdLastMonth,
    clientsWithSocial,
    expiredTokenClients,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: startThisMonth } } }),
    prisma.client.count({
      where: { createdAt: { gte: startLastMonth, lt: endLastMonth } },
    }),
    prisma.client.findMany({
      where: { socialAccounts: { some: {} } },
      select: { metaConnectionStatus: true },
    }),
    prisma.client.findMany({
      where: {
        OR: [
          { metaConnectionStatus: "expired" },
          {
            socialAccounts: {
              some: {
                accessToken: { not: null },
                tokenExpiresAt: { lt: now },
              },
            },
          },
        ],
      },
      select: { id: true, name: true },
      take: 20,
      orderBy: { id: "desc" },
    }),
  ]);

  let clientsTrendPercent: number | null = null;
  if (createdLastMonth > 0) {
    clientsTrendPercent = Math.round(
      ((createdThisMonth - createdLastMonth) / createdLastMonth) * 100,
    );
  } else if (createdThisMonth > 0) {
    clientsTrendPercent = 100;
  }

  const connections = { ok: 0, expired: 0, unknown: 0 };
  for (const c of clientsWithSocial) {
    if (c.metaConnectionStatus === "connected") connections.ok += 1;
    else if (c.metaConnectionStatus === "expired") connections.expired += 1;
    else connections.unknown += 1;
  }

  const adRows = await prisma.adAccount.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
          socialAccounts: { select: { platform: true, accessToken: true } },
        },
      },
    },
  });
  const activeAds = adRows.filter((a) => isActiveAdAccountStatus(a.status));

  let activeCampaignsTotal = 0;
  const spend30ByDate = new Map<string, number>();
  const spend14ByDate = new Map<string, number>();
  const spend30ByClient = new Map<number, number>();

  for (const ad of activeAds) {
    const token = facebookToken(ad.client.socialAccounts);
    if (!token) {
      errors.push(`Brak tokenu FB dla konta reklamowego ${ad.adAccountId} (${ad.client.name})`);
      continue;
    }
    try {
      const campaigns = await listCampaigns(ad.adAccountId, token);
      activeCampaignsTotal += campaigns.filter((c) => c.effective_status === "ACTIVE").length;

      const d30 = await getAdAccountDailySpend(ad.adAccountId, token, "last_30d");
      let sumClient = 0;
      for (const { date, spend } of d30) {
        spend30ByDate.set(date, (spend30ByDate.get(date) ?? 0) + spend);
        sumClient += spend;
      }
      spend30ByClient.set(
        ad.clientId,
        (spend30ByClient.get(ad.clientId) ?? 0) + sumClient,
      );

      const d14 = await getAdAccountDailySpend(ad.adAccountId, token, "last_14d");
      for (const { date, spend } of d14) {
        spend14ByDate.set(date, (spend14ByDate.get(date) ?? 0) + spend);
      }
    } catch (e) {
      if (e instanceof MetaApiError) {
        errors.push(`Marketing API ${ad.adAccountId}: ${e.message}`);
      } else {
        errors.push(`Konto ${ad.adAccountId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const totalSpend30d =
    Math.round(Array.from(spend30ByDate.values()).reduce((a, b) => a + b, 0) * 100) / 100;

  const spend14d = Array.from(spend14ByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({
      date,
      label: formatLabel(date),
      spend: Math.round(spend * 100) / 100,
    }));

  const topClients = Array.from(spend30ByClient.entries())
    .map(([clientId, spend30d]) => {
      const name = adRows.find((a) => a.clientId === clientId)?.client.name ?? `#${clientId}`;
      return { clientId, name, spend30d: Math.round(spend30d * 100) / 100 };
    })
    .sort((a, b) => b.spend30d - a.spend30d)
    .slice(0, 5);

  const highCpcCampaigns: DashboardPayload["needsAttention"]["highCpcCampaigns"] = [];
  for (const ad of activeAds) {
    const token = facebookToken(ad.client.socialAccounts);
    if (!token) continue;
    let checked = 0;
    try {
      const campaigns = await listCampaigns(ad.adAccountId, token);
      const active = campaigns.filter((c: CampaignRow) => c.effective_status === "ACTIVE");
      for (const c of active) {
        if (checked >= MAX_CAMPAIGNS_CPC_CHECK) break;
        checked += 1;
        try {
          const ins = await getCampaignCpcInsight(c.id, token);
          const cpc = ins.cpc;
          const clicks = ins.clicks ?? 0;
          if (
            cpc != null &&
            cpc >= HIGH_CPC_THRESHOLD &&
            clicks >= MIN_CLICKS_FOR_CPC
          ) {
            highCpcCampaigns.push({
              campaignId: c.id,
              name: c.name,
              cpc: Math.round(cpc * 100) / 100,
              clientName: ad.client.name,
              adAccountId: ad.adAccountId,
            });
          }
        } catch {
          /* pojedyncza kampania — pomiń */
        }
      }
    } catch {
      /* już w errors */
    }
  }

  const postsByWeekdayRaw = WEEKDAY_PL.map((weekday) => ({
    weekday,
    facebook: 0,
    instagram: 0,
  }));

  const clientsForPosts = await prisma.client.findMany({
    where: {
      socialAccounts: { some: { accessToken: { not: null } } },
    },
    include: {
      socialAccounts: { where: { accessToken: { not: null } } },
    },
    take: 15,
    orderBy: { id: "desc" },
  });

  const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const cl of clientsForPosts) {
    const fb = cl.socialAccounts.find((s) => s.platform === "facebook");
    const ig = cl.socialAccounts.find((s) => s.platform === "instagram");
    try {
      if (fb?.accessToken) {
        const feed = await getPageFeed(fb.platformId, fb.accessToken, 40);
        for (const p of feed.data ?? []) {
          if (!p.created_time) continue;
          const t = new Date(p.created_time).getTime();
          if (t < weekCutoff) continue;
          const wd = new Date(p.created_time).getDay();
          postsByWeekdayRaw[wd].facebook += 1;
        }
      }
      if (ig?.accessToken) {
        const media = await getInstagramMedia(ig.platformId, ig.accessToken, 40);
        for (const m of media.data ?? []) {
          if (!m.timestamp) continue;
          const t = new Date(m.timestamp).getTime();
          if (t < weekCutoff) continue;
          const wd = new Date(m.timestamp).getDay();
          postsByWeekdayRaw[wd].instagram += 1;
        }
      }
    } catch (e) {
      if (e instanceof MetaApiError) {
        errors.push(`Posty tygodnia (${cl.name}): ${e.message}`);
      }
    }
  }

  const recentComments: DashboardPayload["needsAttention"]["recentComments"] = [];
  const commentClients = await prisma.client.findMany({
    where: { socialAccounts: { some: { accessToken: { not: null } } } },
    include: { socialAccounts: { where: { accessToken: { not: null } } } },
    take: MAX_CLIENTS_FOR_COMMENTS,
    orderBy: { id: "desc" },
  });

  commentLoop: for (const cl of commentClients) {
    const fb = cl.socialAccounts.find((s) => s.platform === "facebook");
    const ig = cl.socialAccounts.find((s) => s.platform === "instagram");
    try {
      if (fb?.accessToken) {
        const feed = await getPageFeed(fb.platformId, fb.accessToken, 3);
        const post = feed.data?.[0];
        if (post) {
          const com = await getObjectComments(post.id, fb.accessToken, 10);
          for (const c of com.data ?? []) {
            if (recentComments.length >= 5) break commentLoop;
            const text = c.message ?? "";
            recentComments.push({
              clientName: cl.name,
              platform: "facebook",
              text: text.length > 200 ? `${text.slice(0, 200)}…` : text,
              possiblyNegative: NEGATIVE_HINT.test(text),
            });
          }
        }
      }
      if (recentComments.length >= 5) break;
      if (ig?.accessToken) {
        const media = await getInstagramMedia(ig.platformId, ig.accessToken, 3);
        const m = media.data?.[0];
        if (m) {
          const com = await getObjectComments(m.id, ig.accessToken, 10);
          for (const c of com.data ?? []) {
            if (recentComments.length >= 5) break commentLoop;
            const text = c.message ?? "";
            recentComments.push({
              clientName: cl.name,
              platform: "instagram",
              text: text.length > 200 ? `${text.slice(0, 200)}…` : text,
              possiblyNegative: NEGATIVE_HINT.test(text),
            });
          }
        }
      }
    } catch (e) {
      if (e instanceof MetaApiError) {
        errors.push(`Komentarze (${cl.name}): ${e.message}`);
      }
    }
  }

  const weekdayOrderMonFirst = [1, 2, 3, 4, 5, 6, 0];
  const postsByWeekday = weekdayOrderMonFirst.map((i) => postsByWeekdayRaw[i]);

  const payload: DashboardPayload = {
    cachedAt: new Date().toISOString(),
    summary: {
      clientsTotal,
      clientsTrendPercent,
      activeCampaignsTotal,
      totalSpend30d,
      connections,
    },
    spend14d,
    postsByWeekday,
    needsAttention: {
      expiredTokens: expiredTokenClients.map((c) => ({
        clientId: c.id,
        clientName: c.name,
      })),
      highCpcCampaigns,
      recentComments,
    },
    topClients,
    errors,
  };

  return payload;
}
