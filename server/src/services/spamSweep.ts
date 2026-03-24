import { prisma } from "../lib/prisma";
import { MetaApiError, deleteComment, getInstagramMedia, getObjectComments, getPageFeed } from "./metaGraph";
import { markClientMetaConnectionExpired } from "./metaConnectionStatus";

function containsBannedWord(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => w.length > 0 && lower.includes(w.toLowerCase()));
}

export type SpamSweepResult = {
  clientsScanned: number;
  commentsChecked: number;
  commentsDeleted: number;
  errors: string[];
};

export async function runGlobalSpamSweep(): Promise<SpamSweepResult> {
  const banned = await prisma.bannedWord.findMany();
  const words = banned.map((b: { word: string }) => b.word.trim()).filter(Boolean);
  const result: SpamSweepResult = {
    clientsScanned: 0,
    commentsChecked: 0,
    commentsDeleted: 0,
    errors: [],
  };

  if (words.length === 0) {
    result.errors.push("Brak zakazanych słów w bazie");
    return result;
  }

  const clients = await prisma.client.findMany({
    include: {
      socialAccounts: { where: { accessToken: { not: null } } },
    },
  });

  const postLimit = 8;
  const commentLimit = 25;

  for (const client of clients) {
    result.clientsScanned += 1;
    for (const sa of client.socialAccounts) {
      const token = sa.accessToken!;
      try {
        if (sa.platform === "facebook") {
          const feed = await getPageFeed(sa.platformId, token, postLimit);
          for (const post of feed.data ?? []) {
            const comments = await getObjectComments(post.id, token, commentLimit);
            for (const c of comments.data ?? []) {
              result.commentsChecked += 1;
              const msg = c.message ?? "";
              if (msg && containsBannedWord(msg, words)) {
                try {
                  await deleteComment(c.id, token);
                  result.commentsDeleted += 1;
                } catch (e) {
                  result.errors.push(`FB delete ${c.id}: ${e instanceof Error ? e.message : String(e)}`);
                }
              }
            }
          }
        } else if (sa.platform === "instagram") {
          const media = await getInstagramMedia(sa.platformId, token, postLimit);
          for (const m of media.data ?? []) {
            const comments = await getObjectComments(m.id, token, commentLimit);
            for (const c of comments.data ?? []) {
              result.commentsChecked += 1;
              const msg = c.message ?? "";
              if (msg && containsBannedWord(msg, words)) {
                try {
                  await deleteComment(c.id, token);
                  result.commentsDeleted += 1;
                } catch (e) {
                  result.errors.push(`IG delete ${c.id}: ${e instanceof Error ? e.message : String(e)}`);
                }
              }
            }
          }
        }
      } catch (e) {
        if (e instanceof MetaApiError && e.tokenExpired) {
          await markClientMetaConnectionExpired(client.id);
          result.errors.push(`Token wygasł (client ${client.id}, ${sa.platform})`);
        } else {
          result.errors.push(`Client ${client.id} ${sa.platform}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  return result;
}
