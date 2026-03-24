import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * Seeduje użytkowników (admin + marketing) i firmę testową w bazie.
 * Wymaga działającego MySQL i `DATABASE_URL` w `server/.env`.
 * Używa `tsx` z `server/node_modules` (bez globalnego `npx tsx`).
 */
export default function globalSetup() {
  const cwd = process.cwd();
  const tsxCli = path.join(cwd, "server", "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(cwd, "server", "scripts", "e2e-seed.ts");
  const result = spawnSync(process.execPath, [tsxCli, script], {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`e2e-seed.ts zakończył się kodem ${result.status ?? "unknown"}`);
  }
}
