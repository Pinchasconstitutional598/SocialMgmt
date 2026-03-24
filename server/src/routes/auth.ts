import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PanelRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware, signToken } from "../middleware/auth";
import {
  exchangeCodeForShortLivedToken,
  exchangeShortLivedForLongLivedUserToken,
  fetchUserPages,
  getFacebookScopes,
} from "../services/facebook";

const router = Router();

router.get("/bootstrap", async (_req, res) => {
  const users = await prisma.panelUser.count();
  res.json({ needsFirstUser: users === 0 });
});

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

function getRedirectUri(): string {
  const u = process.env.FACEBOOK_REDIRECT_URI;
  if (!u) throw new Error("FACEBOOK_REDIRECT_URI is not set");
  return u;
}

function getClientUrl(): string {
  return process.env.CLIENT_URL ?? "http://localhost:5173";
}

type OAuthState = {
  clientId: number;
  sub: number;
};

function signOAuthState(payload: OAuthState): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "10m" });
}

function verifyOAuthState(token: string): OAuthState {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & OAuthState;
  return { clientId: decoded.clientId, sub: decoded.sub };
}

/** Pierwszy administrator — tylko gdy brak użytkowników w bazie */
router.post("/register-first", async (req, res) => {
  const count = await prisma.panelUser.count();
  if (count > 0) {
    res.status(403).json({ error: "Rejestracja wyłączona" });
    return;
  }
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email i password są wymagane" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.panelUser.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
      role: PanelRole.ADMINISTRATOR,
    },
  });
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email i password są wymagane" });
    return;
  }
  const user = await prisma.panelUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
    return;
  }
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

/** Zwraca URL do przekierowania użytkownika do Facebook OAuth */
router.post("/facebook/connect", authMiddleware, (req, res) => {
  const auth = req.auth!;
  const clientId = Number((req.body as { clientId?: number }).clientId);
  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "clientId jest wymagane" });
    return;
  }

  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    res.status(503).json({ error: "Facebook OAuth nie jest skonfigurowany (FACEBOOK_APP_ID)" });
    return;
  }

  const state = signOAuthState({ clientId, sub: auth.sub });
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scope = encodeURIComponent(getFacebookScopes());
  const url =
    `https://www.facebook.com/${process.env.FACEBOOK_API_VERSION ?? "v21.0"}/dialog/oauth` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=${scope}` +
    `&response_type=code`;

  res.json({ url });
});

/**
 * Callback OAuth Meta — musi być zgodny z FACEBOOK_REDIRECT_URI w aplikacji Facebook.
 * Wymiana short-lived → long-lived user token, pobranie stron i zapis tokenów stron (long-lived).
 */
router.get("/facebook", async (req, res) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;
  const errorDescription = req.query.error_description as string | undefined;

  const base = getClientUrl();

  if (error) {
    res.redirect(`${base}/clients?oauth_error=${encodeURIComponent(errorDescription ?? error)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${base}/clients?oauth_error=${encodeURIComponent("Brak code lub state")}`);
    return;
  }

  let oauthState: OAuthState;
  try {
    oauthState = verifyOAuthState(state);
  } catch {
    res.redirect(`${base}/clients?oauth_error=${encodeURIComponent("Nieprawidłowy state")}`);
    return;
  }

  try {
    const redirectUri = getRedirectUri();
    const short = await exchangeCodeForShortLivedToken(code, redirectUri);
    const longUser = await exchangeShortLivedForLongLivedUserToken(short.access_token);
    const expiresAt = longUser.expires_in ? new Date(Date.now() + longUser.expires_in * 1000) : null;

    const pages = await fetchUserPages(longUser.access_token);

    for (const page of pages) {
      await prisma.socialAccount.upsert({
        where: {
          clientId_platform_platformId: {
            clientId: oauthState.clientId,
            platform: "facebook",
            platformId: page.id,
          },
        },
        create: {
          clientId: oauthState.clientId,
          platform: "facebook",
          platformId: page.id,
          accessToken: page.access_token,
          refreshToken: null,
          tokenExpiresAt: expiresAt,
        },
        update: {
          accessToken: page.access_token,
          tokenExpiresAt: expiresAt,
        },
      });

      const ig = page.instagram_business_account;
      if (ig?.id) {
        await prisma.socialAccount.upsert({
          where: {
            clientId_platform_platformId: {
              clientId: oauthState.clientId,
              platform: "instagram",
              platformId: ig.id,
            },
          },
          create: {
            clientId: oauthState.clientId,
            platform: "instagram",
            platformId: ig.id,
            accessToken: page.access_token,
            refreshToken: null,
            tokenExpiresAt: expiresAt,
          },
          update: {
            accessToken: page.access_token,
            tokenExpiresAt: expiresAt,
          },
        });
      }
    }

    res.redirect(`${base}/clients/${oauthState.clientId}?connected=1`);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "OAuth failed";
    res.redirect(`${base}/clients?oauth_error=${encodeURIComponent(msg)}`);
  }
});

export default router;
