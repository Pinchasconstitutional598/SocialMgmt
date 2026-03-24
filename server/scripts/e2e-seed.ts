import path from "path";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, PanelRole } from "@prisma/client";

config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@local.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2E_Admin_123!";
const MARKETING_EMAIL = process.env.E2E_MARKETING_EMAIL ?? "e2e-marketing@local.test";
const MARKETING_PASSWORD = process.env.E2E_MARKETING_PASSWORD ?? "E2E_Marketing_123!";

const E2E_CLIENT_NAME = "Firma E2E Playwright";
const E2E_CLIENT_EMAIL = "firma-e2e-playwright@example.com";

async function main() {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.panelUser.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, passwordHash: adminHash, role: PanelRole.ADMINISTRATOR },
    update: { passwordHash: adminHash, role: PanelRole.ADMINISTRATOR },
  });

  const marketingHash = await bcrypt.hash(MARKETING_PASSWORD, 10);
  await prisma.panelUser.upsert({
    where: { email: MARKETING_EMAIL },
    create: { email: MARKETING_EMAIL, passwordHash: marketingHash, role: PanelRole.MARKETING },
    update: { passwordHash: marketingHash, role: PanelRole.MARKETING },
  });

  await prisma.client.upsert({
    where: { email: E2E_CLIENT_EMAIL },
    create: {
      name: E2E_CLIENT_NAME,
      email: E2E_CLIENT_EMAIL,
      industry: "E2E",
      status: "active",
    },
    update: { name: E2E_CLIENT_NAME, industry: "E2E", status: "active" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
