import "dotenv/config";
import { prisma } from "./lib/prisma";
import { createApp } from "./app";

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
