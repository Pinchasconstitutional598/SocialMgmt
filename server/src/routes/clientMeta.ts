import type { SocialAccount } from "@prisma/client";
import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  MetaApiError,
  deleteComment,
  getInstagramMedia,
  getInstagramProfile,
  getObjectComments,
  getPageFeed,
  getPageProfile,
  publishFacebookPagePhoto,
  publishFacebookPagePost,
  publishInstagramPost,
  replyToFacebookComment,
  replyToInstagramComment,
} from "../services/metaGraph";
import { listCampaigns, setCampaignStatus } from "../services/marketingCampaigns";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

function clientIdParam(req: Request): number {
  const id = (req.params as Record<string, string>).clientId;
  return Number(id);
}

function sendMetaError(res: Response, e: unknown) {
  if (e instanceof MetaApiError) {
    if (e.tokenExpired) {
      res.status(401).json({
        error: "Token Meta wygasł lub jest nieprawidłowy. Ponów autoryzację Facebook/Instagram.",
        code: "TOKEN_EXPIRED",
        metaCode: 190,
      });
      return;
    }
    res.status(502).json({ error: e.message, metaCode: e.metaCode });
    return;
  }
  throw e;
}

async function loadClientSocial(clientId: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      socialAccounts: true,
      adAccounts: true,
    },
  });
  return client;
}

/** Statystyki kart Social (FB fan_count, IG followers) */
router.get("/social-stats", async (req, res) => {
  const clientId = clientIdParam(req);
  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "Nieprawidłowy clientId" });
    return;
  }
  try {
    const client = await loadClientSocial(clientId);
    if (!client) {
      res.status(404).json({ error: "Klient nie znaleziony" });
      return;
    }
    const cards: Array<{
      socialAccountId: number;
      platform: string;
      platformId: string;
      name?: string;
      username?: string;
      fanCount?: number;
      followersCount?: number;
      mediaCount?: number;
      profileUrl?: string;
      pictureUrl?: string;
    }> = [];

    for (const sa of client.socialAccounts) {
      if (!sa.accessToken) continue;
      try {
        if (sa.platform === "facebook") {
          const p = await getPageProfile(sa.platformId, sa.accessToken);
          cards.push({
            socialAccountId: sa.id,
            platform: sa.platform,
            platformId: sa.platformId,
            name: p.name,
            fanCount: p.fan_count,
            profileUrl: p.link,
            pictureUrl: p.picture?.data?.url,
          });
        } else if (sa.platform === "instagram") {
          const p = await getInstagramProfile(sa.platformId, sa.accessToken);
          cards.push({
            socialAccountId: sa.id,
            platform: sa.platform,
            platformId: sa.platformId,
            username: p.username,
            followersCount: p.followers_count,
            mediaCount: p.media_count,
            pictureUrl: p.profile_picture_url,
          });
        }
      } catch (e) {
        sendMetaError(res, e);
        return;
      }
    }

    res.json({ cards });
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.get("/feed", async (req, res) => {
  const clientId = clientIdParam(req);
  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "Nieprawidłowy clientId" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }

  const facebook: Array<{
    socialAccountId: number;
    pageId: string;
    posts: Awaited<ReturnType<typeof getPageFeed>>["data"];
  }> = [];
  const instagram: Array<{
    socialAccountId: number;
    igUserId: string;
    media: Awaited<ReturnType<typeof getInstagramMedia>>["data"];
  }> = [];

  try {
    for (const sa of client.socialAccounts) {
      if (!sa.accessToken) continue;
      if (sa.platform === "facebook") {
        const feed = await getPageFeed(sa.platformId, sa.accessToken, 15);
        facebook.push({ socialAccountId: sa.id, pageId: sa.platformId, posts: feed.data ?? [] });
      } else if (sa.platform === "instagram") {
        const media = await getInstagramMedia(sa.platformId, sa.accessToken, 15);
        instagram.push({ socialAccountId: sa.id, igUserId: sa.platformId, media: media.data ?? [] });
      }
    }
    res.json({ facebook, instagram });
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.get("/comments", async (req, res) => {
  const clientId = clientIdParam(req);
  const objectId = typeof req.query.objectId === "string" ? req.query.objectId : "";
  const platform = typeof req.query.platform === "string" ? req.query.platform : "";
  if (!Number.isFinite(clientId) || !objectId) {
    res.status(400).json({ error: "objectId wymagane" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  const token = client.socialAccounts.find((s: SocialAccount) => s.platform === platform && s.accessToken)?.accessToken;
  if (!token) {
    res.status(400).json({ error: "Brak tokenu dla tej platformy" });
    return;
  }
  try {
    const comments = await getObjectComments(objectId, token, 50);
    res.json({ data: comments.data ?? [] });
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.post("/comment", async (req, res) => {
  const clientId = clientIdParam(req);
  const { platform, commentId, message } = req.body as {
    platform?: string;
    commentId?: string;
    message?: string;
  };
  if (!Number.isFinite(clientId) || !commentId || !message?.trim()) {
    res.status(400).json({ error: "platform, commentId, message wymagane" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  const token = client.socialAccounts.find((s: SocialAccount) => s.platform === platform && s.accessToken)?.accessToken;
  if (!token) {
    res.status(400).json({ error: "Brak tokenu dla tej platformy" });
    return;
  }
  try {
    if (platform === "facebook") {
      const out = await replyToFacebookComment(commentId, message.trim(), token);
      res.json(out);
    } else if (platform === "instagram") {
      const out = await replyToInstagramComment(commentId, message.trim(), token);
      res.json(out);
    } else {
      res.status(400).json({ error: "platform musi być facebook lub instagram" });
    }
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.delete("/comment/:commentId", async (req, res) => {
  const clientId = clientIdParam(req);
  const commentId = req.params.commentId;
  const platform = typeof req.query.platform === "string" ? req.query.platform : "";
  if (!Number.isFinite(clientId) || !commentId || !platform) {
    res.status(400).json({ error: "platform (query) wymagane" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  const token = client.socialAccounts.find((s: SocialAccount) => s.platform === platform && s.accessToken)?.accessToken;
  if (!token) {
    res.status(400).json({ error: "Brak tokenu dla tej platformy" });
    return;
  }
  try {
    const out = await deleteComment(commentId, token);
    res.json(out);
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.post("/publish", async (req, res) => {
  const clientId = clientIdParam(req);
  const body = req.body as {
    platform?: string;
    socialAccountId?: number;
    message?: string;
    imageUrl?: string;
    link?: string;
  };
  if (!Number.isFinite(clientId) || !body.message?.trim()) {
    res.status(400).json({ error: "message wymagane" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  const sa =
    body.socialAccountId != null
      ? client.socialAccounts.find((s: SocialAccount) => s.id === body.socialAccountId)
      : client.socialAccounts.find((s: SocialAccount) => s.platform === body.platform && s.accessToken);
  if (!sa?.accessToken) {
    res.status(400).json({ error: "Nie znaleziono konta społecznościowego z tokenem" });
    return;
  }
  try {
    if (sa.platform === "facebook") {
      if (body.imageUrl) {
        const out = await publishFacebookPagePhoto(sa.platformId, sa.accessToken, body.imageUrl, body.message!.trim());
        res.json(out);
      } else {
        const out = await publishFacebookPagePost(sa.platformId, sa.accessToken, {
          message: body.message!.trim(),
          link: body.link,
        });
        res.json(out);
      }
    } else if (sa.platform === "instagram") {
      if (!body.imageUrl) {
        res.status(400).json({ error: "Instagram wymaga imageUrl (obraz publiczny HTTPS)" });
        return;
      }
      const out = await publishInstagramPost(sa.platformId, sa.accessToken, {
        caption: body.message!.trim(),
        imageUrl: body.imageUrl,
      });
      res.json(out);
    } else {
      res.status(400).json({ error: "Nieobsługiwana platforma" });
    }
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.get("/campaigns", async (req, res) => {
  const clientId = clientIdParam(req);
  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "Nieprawidłowy clientId" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  const ad = client.adAccounts[0];
  const fbToken = client.socialAccounts.find(
    (s: SocialAccount) => s.platform === "facebook" && s.accessToken,
  )?.accessToken;
  if (!ad || !fbToken) {
    res.json({ campaigns: [], hint: "Dodaj konto reklamowe (AdAccount) i połącz Facebook z uprawnieniami ads." });
    return;
  }
  try {
    const campaigns = await listCampaigns(ad.adAccountId, fbToken);
    const active = campaigns.filter((c) =>
      ["ACTIVE", "PAUSED", "PENDING_REVIEW", "WITH_ISSUES", "ARCHIVED"].includes(c.effective_status),
    );
    res.json({ campaigns: active, adAccountId: ad.adAccountId });
  } catch (e) {
    sendMetaError(res, e);
  }
});

router.patch("/campaigns/:campaignId", async (req, res) => {
  const clientId = clientIdParam(req);
  const campaignId = req.params.campaignId;
  const status = (req.body as { status?: string }).status;
  if (!Number.isFinite(clientId) || !campaignId || (status !== "ACTIVE" && status !== "PAUSED")) {
    res.status(400).json({ error: "status musi być ACTIVE lub PAUSED" });
    return;
  }
  const client = await loadClientSocial(clientId);
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  const fbToken = client.socialAccounts.find(
    (s: SocialAccount) => s.platform === "facebook" && s.accessToken,
  )?.accessToken;
  if (!fbToken) {
    res.status(400).json({ error: "Brak tokenu Facebook (ads)" });
    return;
  }
  try {
    await setCampaignStatus(campaignId, fbToken, status);
    res.json({ ok: true });
  } catch (e) {
    sendMetaError(res, e);
  }
});

export default router;
