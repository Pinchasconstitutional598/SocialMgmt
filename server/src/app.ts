import "dotenv/config";
import { PanelRole } from "@prisma/client";
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { prisma } from "./lib/prisma";
import { authMiddleware, requireRole } from "./middleware/auth";
import authRoutes from "./routes/auth";
import clientMetaRoutes from "./routes/clientMeta";
import clientsRoutes from "./routes/clients";
import marketingRoutes from "./routes/marketing";
import statsRoutes from "./routes/stats";
import adminRoutes from "./routes/admin";
import mediaRoutes from "./routes/media";

/**
 * Aplikacja Express bez nasłuchiwania na porcie — używana w testach integracyjnych (Supertest).
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json());

  const uploadsPublic = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadsPublic, { recursive: true });
  app.use("/uploads", express.static(uploadsPublic));

  /** Publiczny healthcheck (np. load balancer / Playwright); bez danych wrażliwych. */
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/db-check", authMiddleware, requireRole(PanelRole.ADMINISTRATOR), async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const clientCount = await prisma.client.count();
      res.json({ connected: true, clients: clientCount });
    } catch (e) {
      console.error(e);
      res.status(503).json({
        connected: false,
        error: e instanceof Error ? e.message : "Database error",
      });
    }
  });

  app.use("/api/media", mediaRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/clients/:clientId/meta", clientMetaRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/marketing", marketingRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/admin", adminRoutes);

  return app;
}
