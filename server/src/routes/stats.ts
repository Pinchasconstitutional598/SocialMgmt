import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getCachedDashboardPayload, getCachedSummaryOnly } from "../services/statsService";

const router = Router();
router.use(authMiddleware);

/** Karty KPI + trend — cache 5 min (współdzielony z /dashboard) */
router.get("/summary", async (_req, res) => {
  try {
    const data = await getCachedSummaryOnly();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : "stats summary failed" });
  }
});

/** Pełny payload dashboardu (wykresy, uwaga, top klienci) — cache 5 min */
router.get("/dashboard", async (_req, res) => {
  try {
    const data = await getCachedDashboardPayload();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : "stats dashboard failed" });
  }
});

export default router;
