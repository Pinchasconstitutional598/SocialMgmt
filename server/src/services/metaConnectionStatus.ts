import { prisma } from "../lib/prisma";

/** Wartości zapisane w `Client.metaConnectionStatus`. */
export const META_CONNECTION = {
  unknown: "unknown",
  connected: "connected",
  expired: "expired",
} as const;

export async function markClientMetaConnectionExpired(clientId: number): Promise<void> {
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { metaConnectionStatus: META_CONNECTION.expired },
    });
  } catch {
    /* klient mógł zostać usunięty */
  }
}

export async function markClientMetaConnectionConnected(clientId: number): Promise<void> {
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { metaConnectionStatus: META_CONNECTION.connected },
    });
  } catch {
    /* ignore */
  }
}
