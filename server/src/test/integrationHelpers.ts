import bcrypt from "bcryptjs";
import { PanelRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { signToken } from "../middleware/auth";

const INTEGRATION_EMAIL = "integration-panel@local.test";

/** Użytkownik panelu + JWT do nagłówka Authorization w testach integracyjnych. */
export async function getIntegrationAuthHeader(): Promise<{ Authorization: string }> {
  const passwordHash = await bcrypt.hash("IntegrationTest#1", 10);
  const user = await prisma.panelUser.upsert({
    where: { email: INTEGRATION_EMAIL },
    create: {
      email: INTEGRATION_EMAIL,
      passwordHash,
      role: PanelRole.MARKETING,
    },
    update: {},
  });
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { Authorization: `Bearer ${token}` };
}

/** Usuwa klientów testowych (email *@integration.test) i powiązania (CASCADE). */
export async function cleanupIntegrationClients(): Promise<void> {
  await prisma.client.deleteMany({
    where: { email: { endsWith: "@integration.test" } },
  });
}
