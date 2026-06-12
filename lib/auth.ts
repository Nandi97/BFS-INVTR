import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
// @ts-ignore — generated after migrate


export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh if older than 1 day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "VIEWER",
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
