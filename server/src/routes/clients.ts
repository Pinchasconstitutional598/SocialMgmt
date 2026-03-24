import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

function parsePage(q: unknown): number {
  const n = typeof q === "string" || typeof q === "number" ? Number(q) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parsePageSize(q: unknown): number {
  const n = typeof q === "string" || typeof q === "number" ? Number(q) : NaN;
  const raw = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 25;
  return Math.min(100, Math.max(5, raw));
}

router.get("/", async (req, res) => {
  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const where =
    search.length > 0
      ? {
          OR: [{ name: { contains: search } }, { email: { contains: search } }, { industry: { contains: search } }],
        }
      : {};

  // MySQL: Prisma mapuje `take` → LIMIT, `skip` → OFFSET (tylko żądana strona).
  const [total, rawRows] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        industry: true,
        status: true,
        metaConnectionStatus: true,
        _count: { select: { socialAccounts: true } },
      },
    }),
  ]);

  const data = rawRows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    industry: r.industry,
    status: r.status,
    metaConnectionStatus: r.metaConnectionStatus,
    socialAccountsCount: r._count.socialAccounts,
  }));

  res.json({
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Nieprawidłowe ID" });
    return;
  }
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      socialAccounts: {
        select: {
          id: true,
          platform: true,
          platformId: true,
          tokenExpiresAt: true,
        },
      },
      adAccounts: true,
    },
  });
  if (!client) {
    res.status(404).json({ error: "Klient nie znaleziony" });
    return;
  }
  res.json(client);
});

router.post("/", async (req, res) => {
  const { name, email, industry, status } = req.body as {
    name?: string;
    email?: string;
    industry?: string;
    status?: string;
  };
  if (!name?.trim() || !email?.trim() || !status?.trim()) {
    res.status(400).json({ error: "name, email i status są wymagane" });
    return;
  }
  try {
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        industry: industry?.trim() || null,
        status: status.trim(),
      },
    });
    res.status(201).json(client);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      res.status(409).json({ error: "Klient z tym emailem już istnieje" });
      return;
    }
    throw e;
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Nieprawidłowe ID" });
    return;
  }
  const { name, email, industry, status } = req.body as {
    name?: string;
    email?: string;
    industry?: string | null;
    status?: string;
  };
  try {
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(industry !== undefined && { industry: industry?.trim() || null }),
        ...(status !== undefined && { status: status.trim() }),
      },
    });
    res.json(client);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      res.status(404).json({ error: "Klient nie znaleziony" });
      return;
    }
    if (code === "P2002") {
      res.status(409).json({ error: "Klient z tym emailem już istnieje" });
      return;
    }
    throw e;
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Nieprawidłowe ID" });
    return;
  }
  try {
    await prisma.client.delete({ where: { id } });
    res.status(204).send();
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      res.status(404).json({ error: "Klient nie znaleziony" });
      return;
    }
    throw e;
  }
});

export default router;
