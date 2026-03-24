import { metaGraphFetch } from "./metaApiFetch";

const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export function getFacebookScopes(): string {
  return [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_ads",
    "ads_read",
    "ads_management",
    "business_management",
    "instagram_basic",
    "instagram_manage_insights",
    "public_profile",
    "email",
  ].join(",");
}

export async function exchangeCodeForShortLivedToken(code: string, redirectUri: string): Promise<TokenResponse> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not configured");

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    client_secret: appSecret,
    code,
  });

  const res = await metaGraphFetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const data = (await res.json()) as TokenResponse & { error?: { message: string } };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Facebook token error: ${res.status}`);
  }
  return data;
}

export async function exchangeShortLivedForLongLivedUserToken(shortLivedUserToken: string): Promise<TokenResponse> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not configured");

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedUserToken,
  });

  const res = await metaGraphFetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const data = (await res.json()) as TokenResponse & { error?: { message: string } };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Facebook long-lived error: ${res.status}`);
  }
  return data;
}

export type PageAccount = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

export async function fetchUserPages(longLivedUserToken: string): Promise<PageAccount[]> {
  const fields = "id,name,access_token,instagram_business_account{id}";
  const url = `${GRAPH}/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(longLivedUserToken)}`;
  const res = await metaGraphFetch(url);
  const data = (await res.json()) as {
    data?: PageAccount[];
    error?: { message: string };
  };
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}
