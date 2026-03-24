import { afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { cleanupIntegrationClients, getIntegrationAuthHeader } from "../test/integrationHelpers";

const app = createApp();

describe("API integracyjne — /api/clients", () => {
  let authHeaders: { Authorization: string };

  beforeAll(async () => {
    authHeaders = await getIntegrationAuthHeader();
  });

  afterEach(async () => {
    await cleanupIntegrationClients();
  });

  it("POST /api/clients zapisuje klienta w MySQL z poprawnymi polami", async () => {
    const email = `firm-${Date.now()}@integration.test`;
    const res = await request(app).post("/api/clients").set(authHeaders).send({
      name: "Firma Testowa Sp. z o.o.",
      email,
      industry: "IT",
      status: "active",
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Firma Testowa Sp. z o.o.");
    expect(res.body.email).toBe(email);
    expect(res.body.id).toBeDefined();

    const row = await prisma.client.findUnique({ where: { email } });
    expect(row).not.toBeNull();
    expect(row!.name).toBe("Firma Testowa Sp. z o.o.");
    expect(row!.industry).toBe("IT");
    expect(row!.status).toBe("active");
  });

  it("POST /api/clients bez nazwy firmy (name) zwraca 400", async () => {
    const res = await request(app)
      .post("/api/clients")
      .set(authHeaders)
      .send({
        email: `noname-${Date.now()}@integration.test`,
        status: "active",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name|wymagane/i);
  });

  it("POST /api/clients bez autoryzacji zwraca 401", async () => {
    const res = await request(app)
      .post("/api/clients")
      .send({
        name: "X",
        email: `noauth-${Date.now()}@integration.test`,
        status: "active",
      });

    expect(res.status).toBe(401);
  });
});

describe("SocialAccount — izolacja client_id (MySQL)", () => {
  let authHeaders: { Authorization: string };

  beforeAll(async () => {
    authHeaders = await getIntegrationAuthHeader();
  });

  afterEach(async () => {
    await cleanupIntegrationClients();
  });

  it("upsert tokenu Facebook aktualizuje tylko rekord danego klienta; drugi klient bez zmian", async () => {
    const resA = await request(app)
      .post("/api/clients")
      .set(authHeaders)
      .send({
        name: "Klient A",
        email: `a-${Date.now()}@integration.test`,
        status: "active",
      });
    const resB = await request(app)
      .post("/api/clients")
      .set(authHeaders)
      .send({
        name: "Klient B",
        email: `b-${Date.now()}@integration.test`,
        status: "active",
      });

    const idA = resA.body.id as number;
    const idB = resB.body.id as number;
    const sharedPageId = "page_shared_123";

    await prisma.socialAccount.create({
      data: {
        clientId: idA,
        platform: "facebook",
        platformId: sharedPageId,
        accessToken: "TOKEN_A_STARY",
      },
    });
    await prisma.socialAccount.create({
      data: {
        clientId: idB,
        platform: "facebook",
        platformId: sharedPageId,
        accessToken: "TOKEN_B",
      },
    });

    await prisma.socialAccount.upsert({
      where: {
        clientId_platform_platformId: {
          clientId: idA,
          platform: "facebook",
          platformId: sharedPageId,
        },
      },
      create: {
        clientId: idA,
        platform: "facebook",
        platformId: sharedPageId,
        accessToken: "TOKEN_A_NOWY",
      },
      update: {
        accessToken: "TOKEN_A_NOWY",
      },
    });

    const rowA = await prisma.socialAccount.findUnique({
      where: {
        clientId_platform_platformId: {
          clientId: idA,
          platform: "facebook",
          platformId: sharedPageId,
        },
      },
    });
    const rowB = await prisma.socialAccount.findUnique({
      where: {
        clientId_platform_platformId: {
          clientId: idB,
          platform: "facebook",
          platformId: sharedPageId,
        },
      },
    });

    expect(rowA?.accessToken).toBe("TOKEN_A_NOWY");
    expect(rowB?.accessToken).toBe("TOKEN_B");
    expect(rowB?.clientId).toBe(idB);
    expect(rowA?.clientId).toBe(idA);
  });
});
