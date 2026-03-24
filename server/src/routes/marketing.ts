import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { getAdAccountDailySpendLast7Days } from "../services/marketingCampaigns";
import { MetaApiError } from "../services/metaGraph";
import { markClientMetaConnectionExpired } from "../services/metaConnectionStatus";

const router = Router();
router.use(authMiddleware);

function isActiveAdAccountStatus(status: string): boolean {
  return status.trim().toLowerCase() === "active";
}

function facebookTokenForClient(socialAccounts: { platform: string; accessToken: string | null }[]): string | null {
  const fb = socialAccounts.find((s) => s.platform === "facebook" && s.accessToken);
  return fb?.accessToken ?? null;
}

/**
 * Agreguje dzienne wydatki (ostatnie 7 dni) ze wszystkich aktywnych kont reklamowych w bazie.
 */
router.get("/ad-spend-overview", async (_req, res) => {
  const adAccounts = await prisma.adAccount.findMany({
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

  const active = adAccounts.filter((a) => isActiveAdAccountStatus(a.status));

  if (active.length === 0) {
    res.json({
      series: [] as Array<{ date: string; spend: number; label: string }>,
      totalSpend: 0,
      accountsScanned: 0,
      errors: ["Brak kont reklamowych ze statusem „active” w bazie."],
    });
    return;
  }

  const byDate = new Map<string, number>();
  const errors: string[] = [];

  for (const ad of active) {
    const token = facebookTokenForClient(ad.client.socialAccounts);
    if (!token) {
      errors.push(`Konto act_${ad.adAccountId.replace(/^act_/, "")} (klient: ${ad.client.name}): brak tokenu Facebook.`);
      continue;
    }
    try {
      const days = await getAdAccountDailySpendLast7Days(ad.adAccountId, token);
      for (const { date, spend } of days) {
        byDate.set(date, (byDate.get(date) ?? 0) + spend);
      }
    } catch (e) {
      if (e instanceof MetaApiError) {
        if (e.tokenExpired) {
          await markClientMetaConnectionExpired(ad.clientId);
        }
        errors.push(
          `Konto ${ad.adAccountId} (klient: ${ad.client.name}): ${e.message}${e.tokenExpired ? " — ponów autoryzację." : ""}`,
        );
      } else {
        errors.push(`Konto ${ad.adAccountId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const series = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({
      date,
      spend: Math.round(spend * 100) / 100,
      label: formatChartDateLabel(date),
    }));

  const totalSpend = Math.round(series.reduce((s, x) => s + x.spend, 0) * 100) / 100;

  res.json({
    series,
    totalSpend,
    accountsScanned: active.length,
    errors,
  });
});

function formatChartDateLabel(isoDate: string): string {
  const p = isoDate.split("-");
  if (p.length !== 3) return isoDate;
  return `${p[2]}.${p[1]}.${p[0]}`;
}

export default router;
