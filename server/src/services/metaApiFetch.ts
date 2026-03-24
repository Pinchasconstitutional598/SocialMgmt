/**
 * Wrapper dla `fetch` do graph.facebook.com: limit RPS + reakcja na
 * nagłówek `x-business-use-case-usage` (zwolnienie przy zbliżaniu się do limitów).
 */

function readMaxRps(): number {
  const raw = process.env.META_GRAPH_MAX_RPS;
  if (raw === undefined || raw === "") return 8;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

function skipRateLimit(): boolean {
  return process.env.NODE_ENV === "test" || process.env.META_GRAPH_SKIP_RATE_LIMIT === "1";
}

function maxUsageCooldownSec(): number {
  const n = Number(process.env.META_GRAPH_MAX_USAGE_COOLDOWN_SEC ?? 300);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 3600) : 300;
}

/** Rekursywnie zbiera największe `estimated_time_to_regain_access` (sekundy). */
export function maxEstimatedTimeToRegainAccessFromUsageJson(value: unknown): number {
  if (value == null) return 0;
  if (Array.isArray(value)) {
    let m = 0;
    for (const x of value) m = Math.max(m, maxEstimatedTimeToRegainAccessFromUsageJson(x));
    return m;
  }
  if (typeof value === "object") {
    let m = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "estimated_time_to_regain_access" && typeof v === "number" && Number.isFinite(v)) {
        m = Math.max(m, v);
      }
      m = Math.max(m, maxEstimatedTimeToRegainAccessFromUsageJson(v));
    }
    return m;
  }
  return 0;
}

/**
 * Parsuje nagłówek `x-business-use-case-usage` (JSON) z odpowiedzi Graph / Marketing API.
 * @see https://developers.facebook.com/docs/graph-api/overview/rate-limiting/
 */
export function parseBusinessUseCaseUsageHeader(raw: string | null): { regainSeconds: number } {
  if (!raw?.trim()) return { regainSeconds: 0 };
  try {
    const parsed = JSON.parse(raw) as unknown;
    return { regainSeconds: maxEstimatedTimeToRegainAccessFromUsageJson(parsed) };
  } catch {
    return { regainSeconds: 0 };
  }
}

let nextEarliestStart = 0;
let usageCooldownUntil = 0;

function applyBusinessUseCaseUsage(headers: Headers): void {
  const raw = headers.get("x-business-use-case-usage") ?? headers.get("X-Business-Use-Case-Usage");
  const { regainSeconds } = parseBusinessUseCaseUsageHeader(raw);
  if (regainSeconds <= 0) return;
  const capped = Math.min(regainSeconds, maxUsageCooldownSec());
  usageCooldownUntil = Math.max(usageCooldownUntil, Date.now() + capped * 1000);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitBeforeNextRequest(): Promise<void> {
  if (skipRateLimit()) return;

  const minIntervalMs = Math.ceil(1000 / readMaxRps());
  const now = Date.now();
  const waitForInterval = Math.max(0, nextEarliestStart - now);
  const waitForUsage = Math.max(0, usageCooldownUntil - now);
  await sleep(Math.max(waitForInterval, waitForUsage));

  nextEarliestStart = Date.now() + minIntervalMs;
}

let chain: Promise<void> = Promise.resolve();

/**
 * Globalna kolejka: żądania do Meta idą jedno po drugim z opóźnieniem,
 * żeby respektować RPS i cooldown z nagłówków.
 */
export function metaGraphFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    chain = chain
      .catch(() => {})
      .then(async () => {
        try {
          await waitBeforeNextRequest();
          const res = await fetch(input, init);
          applyBusinessUseCaseUsage(res.headers);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
  });
}

/** Tylko testy — reset stanu limitera między suite'ami. */
export function resetMetaGraphFetchStateForTests(): void {
  nextEarliestStart = 0;
  usageCooldownUntil = 0;
  chain = Promise.resolve();
}
