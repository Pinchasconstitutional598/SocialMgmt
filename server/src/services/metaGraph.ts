import { metaGraphFetch } from "./metaApiFetch";

function graphBaseUrl(): string {
  const v = process.env.GRAPH_API_VERSION ?? "v20.0";
  return `https://graph.facebook.com/${v}`;
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public metaCode: number | string | undefined,
    public httpStatus: number,
  ) {
    super(message);
    this.name = "MetaApiError";
  }

  get tokenExpired(): boolean {
    return this.metaCode === 190 || this.metaCode === "190" || String(this.metaCode) === "190";
  }
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const base = graphBaseUrl();
  const u = new URL(path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function graphJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await metaGraphFetch(url, init);
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new MetaApiError(text.slice(0, 500) || res.statusText, undefined, res.status);
      }
      throw new MetaApiError("Niepoprawna odpowiedź JSON z Graph API", undefined, res.status);
    }
  }
  const data = (parsed ?? {}) as T & { error?: { message: string; code: number; type?: string } };
  if (data && typeof data === "object" && "error" in data && data.error) {
    const e = data.error;
    throw new MetaApiError(e.message ?? "Graph API error", e.code, res.status);
  }
  if (!res.ok) {
    throw new MetaApiError(`HTTP ${res.status}`, undefined, res.status);
  }
  return data as T;
}

/**
 * Wymiana short-lived user token → long-lived (OAuth fb_exchange_token).
 * Używa tego samego endpointu co Facebook Login; błędy 401/190 mapują na {@link MetaApiError}.
 */
export async function exchangeLongLivedUserToken(shortLivedUserToken: string): Promise<{
  access_token: string;
  token_type?: string;
  expires_in?: number;
}> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not configured");
  }
  const url = buildUrl(`/oauth/access_token`, {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedUserToken,
  });
  return graphJson<{
    access_token: string;
    token_type?: string;
    expires_in?: number;
  }>(url);
}

export async function getPageProfile(pageId: string, accessToken: string) {
  const fields = "name,fan_count,link,picture{url}";
  const url = buildUrl(`/${pageId}`, { fields, access_token: accessToken });
  return graphJson<{
    name: string;
    fan_count?: number;
    link?: string;
    picture?: { data?: { url?: string } };
  }>(url);
}

export async function getInstagramProfile(igUserId: string, accessToken: string) {
  const fields = "username,profile_picture_url,followers_count,media_count";
  const url = buildUrl(`/${igUserId}`, { fields, access_token: accessToken });
  return graphJson<{
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
  }>(url);
}

export async function getPageFeed(pageId: string, accessToken: string, limit = 25) {
  const fields = "id,message,created_time,permalink_url,status_type";
  const url = buildUrl(`/${pageId}/feed`, {
    fields,
    limit,
    access_token: accessToken,
  });
  return graphJson<{
    data: Array<{
      id: string;
      message?: string;
      created_time?: string;
      permalink_url?: string;
      status_type?: string;
    }>;
    paging?: { next?: string };
  }>(url);
}

export async function getInstagramMedia(igUserId: string, accessToken: string, limit = 25) {
  const fields = "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url";
  const url = buildUrl(`/${igUserId}/media`, {
    fields,
    limit,
    access_token: accessToken,
  });
  return graphJson<{
    data: Array<{
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      permalink?: string;
      timestamp?: string;
      thumbnail_url?: string;
    }>;
    paging?: { next?: string };
  }>(url);
}

export async function getObjectComments(objectId: string, accessToken: string, limit = 50) {
  const fields = "id,message,created_time,from{id,name},like_count,comment_count";
  const url = buildUrl(`/${objectId}/comments`, {
    fields,
    limit,
    access_token: accessToken,
  });
  return graphJson<{
    data: Array<{
      id: string;
      message?: string;
      created_time?: string;
      from?: { id: string; name?: string };
      like_count?: number;
      comment_count?: number;
    }>;
    paging?: { next?: string };
  }>(url);
}

/** Odpowiedź na komentarz FB (post) lub IG (media) — endpoint zależy od platformy */
export async function replyToFacebookComment(commentId: string, message: string, accessToken: string) {
  const url = buildUrl(`/${commentId}/comments`, { access_token: accessToken });
  const body = new URLSearchParams({ message });
  return graphJson<{ id: string }>(url, { method: "POST", body });
}

export async function replyToInstagramComment(commentId: string, message: string, accessToken: string) {
  const url = buildUrl(`/${commentId}/replies`, { access_token: accessToken });
  const body = new URLSearchParams({ message });
  return graphJson<{ id: string }>(url, { method: "POST", body });
}

export async function deleteComment(commentId: string, accessToken: string) {
  const url = buildUrl(`/${commentId}`, { access_token: accessToken });
  return graphJson<{ success: boolean }>(url, { method: "DELETE" });
}

export async function publishFacebookPagePost(
  pageId: string,
  accessToken: string,
  opts: { message: string; link?: string },
) {
  const url = buildUrl(`/${pageId}/feed`, { access_token: accessToken });
  const body = new URLSearchParams({ message: opts.message });
  if (opts.link) body.set("link", opts.link);
  return graphJson<{ id: string }>(url, { method: "POST", body });
}

export async function publishFacebookPagePhoto(pageId: string, accessToken: string, imageUrl: string, caption: string) {
  const url = buildUrl(`/${pageId}/photos`, { access_token: accessToken });
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    published: "true",
  });
  return graphJson<{ id: string; post_id?: string }>(url, { method: "POST", body });
}

export async function publishInstagramPost(
  igUserId: string,
  accessToken: string,
  opts: { caption: string; imageUrl?: string },
) {
  if (!opts.imageUrl) {
    throw new Error("Instagram wymaga imageUrl (kontener obrazu)");
  }
  const createUrl = buildUrl(`/${igUserId}/media`, { access_token: accessToken });
  const createBody = new URLSearchParams({
    image_url: opts.imageUrl,
    caption: opts.caption,
  });
  const created = await graphJson<{ id: string }>(createUrl, { method: "POST", body: createBody });
  const publishUrl = buildUrl(`/${igUserId}/media_publish`, { access_token: accessToken });
  const publishBody = new URLSearchParams({ creation_id: created.id });
  return graphJson<{ id: string }>(publishUrl, { method: "POST", body: publishBody });
}
