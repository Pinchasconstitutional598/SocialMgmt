import { afterAll, afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { resetMetaGraphFetchStateForTests } from "./metaApiFetch";
import { exchangeLongLivedUserToken, MetaApiError, publishFacebookPagePost } from "./metaGraph";

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION ?? "v20.0"}`;

const msw = setupServer();

beforeAll(() => {
  msw.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  msw.resetHandlers();
  resetMetaGraphFetchStateForTests();
});

afterAll(() => {
  msw.close();
});

describe("MetaGraphService — exchangeLongLivedUserToken (odświeżanie tokenu)", () => {
  it("mapuje odpowiedź 401 z Meta na MetaApiError z kodem 190 (wygasły token)", async () => {
    msw.use(
      rest.get(`${GRAPH}/oauth/access_token`, (_req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({
            error: {
              message: "Invalid OAuth access token.",
              type: "OAuthException",
              code: 190,
              fbtrace_id: "ABC",
            },
          }),
        );
      }),
    );

    try {
      await exchangeLongLivedUserToken("short_bad");
      throw new Error("oczekiwano MetaApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(MetaApiError);
      const err = e as MetaApiError;
      expect(err.httpStatus).toBe(401);
      expect(err.metaCode).toBe(190);
      expect(err.tokenExpired).toBe(true);
    }
  });

  it("zwraca access_token przy udanej wymianie", async () => {
    msw.use(
      rest.get(`${GRAPH}/oauth/access_token`, (_req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "long_lived_token",
            token_type: "bearer",
            expires_in: 5183944,
          }),
        );
      }),
    );

    const out = await exchangeLongLivedUserToken("short_ok");
    expect(out.access_token).toBe("long_lived_token");
    expect(out.expires_in).toBe(5183944);
  });
});

describe("MetaGraphService — publishFacebookPagePost (publikacja posta)", () => {
  it("wysyła ciało jako application/x-www-form-urlencoded (message, link), nie jako JSON", async () => {
    let requestUrl = "";
    let bodyText = "";
    let contentType = "";

    msw.use(
      rest.post(`${GRAPH}/:pageId/feed`, async (req, res, ctx) => {
        requestUrl = req.url.toString();
        contentType = req.headers.get("content-type") ?? "";
        bodyText = await req.text();
        return res(ctx.json({ id: "post_999" }));
      }),
    );

    const result = await publishFacebookPagePost("PAGE_42", "PAGE_TOKEN_XYZ", {
      message: "Treść posta",
      link: "https://example.com/promo",
    });

    expect(result.id).toBe("post_999");
    expect(requestUrl).toContain("access_token=PAGE_TOKEN_XYZ");
    expect(requestUrl).toContain("/PAGE_42/feed");

    const params = new URLSearchParams(bodyText);
    expect(params.get("message")).toBe("Treść posta");
    expect(params.get("link")).toBe("https://example.com/promo");
    expect(bodyText.trim().startsWith("{")).toBe(false);
    expect(contentType).toContain("application/x-www-form-urlencoded");
  });
});
