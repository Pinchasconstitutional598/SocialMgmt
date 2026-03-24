import { PrismaClient } from "@prisma/client";
import { decryptTokenAtRest, encryptTokenAtRest } from "./tokenCrypto";

function encryptSocialAccountWriteData(data: Record<string, unknown>) {
  if (typeof data.accessToken === "string") {
    data.accessToken = encryptTokenAtRest(data.accessToken) as string;
  }
  if (typeof data.refreshToken === "string") {
    data.refreshToken = encryptTokenAtRest(data.refreshToken) as string;
  }
}

const base = new PrismaClient();

export const prisma = base.$extends({
  query: {
    socialAccount: {
      async create({ args, query }) {
        encryptSocialAccountWriteData(args.data as Record<string, unknown>);
        return query(args);
      },
      async update({ args, query }) {
        encryptSocialAccountWriteData(args.data as Record<string, unknown>);
        return query(args);
      },
      async upsert({ args, query }) {
        encryptSocialAccountWriteData(args.create as Record<string, unknown>);
        encryptSocialAccountWriteData(args.update as Record<string, unknown>);
        return query(args);
      },
      async updateMany({ args, query }) {
        if (args.data) encryptSocialAccountWriteData(args.data as Record<string, unknown>);
        return query(args);
      },
    },
  },
  result: {
    socialAccount: {
      accessToken: {
        needs: { accessToken: true },
        compute(s) {
          return decryptTokenAtRest(s.accessToken) ?? null;
        },
      },
      refreshToken: {
        needs: { refreshToken: true },
        compute(s) {
          return decryptTokenAtRest(s.refreshToken) ?? null;
        },
      },
    },
  },
});
