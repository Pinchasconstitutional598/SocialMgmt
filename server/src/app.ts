import "dotenv/config";
import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth";
import clientMetaRoutes from "./routes/clientMeta";
import clientsRoutes from "./routes/clients";
import adminRoutes from "./routes/admin";

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

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/db-check", async (_req, res) => {
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

  app.use("/api/auth", authRoutes);
  app.use("/api/clients/:clientId/meta", clientMetaRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/admin", adminRoutes);

  return app;
}
