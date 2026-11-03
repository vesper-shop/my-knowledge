import type { Auth, BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth/minimal";
import { genericOAuth } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";

import { authBindingsSchema } from "@/auth/bindings";
import { authSchema } from "@/db/schema";

async function authBuilder(): Promise<Auth> {
  const bindings = authBindingsSchema.parse(env);
  const allowedEmail = bindings.ALLOWED_EMAIL.toLowerCase();
  return betterAuth<BetterAuthOptions>({
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "you-find-me",
            name: "you-find.me",
            discoveryUrl: "https://you-find.me/api/auth/.well-known/openid-configuration",
            clientId: "knowledge",
            clientSecret: bindings.YOU_FIND_ME_CLIENT_SECRET,
            scopes: ["openid", "profile", "email"],
            tokenEndpointAuth: { method: "client_secret_basic" },
            pkce: true,
          },
        ],
      }),
    ],
    appName: "my knowledge",
    baseURL: bindings.BETTER_AUTH_URL,
    secret: bindings.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
      provider: "sqlite",
      schema: authSchema,
    }),
    account: {
      accountLinking: { trustedProviders: ["you-find-me"] },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            if (newUser.email.toLowerCase() !== allowedEmail) return false;
            return { data: newUser };
          },
        },
      },
    },
  });
}

let authPromise: Promise<Auth> | null = null;

export function createAuth() {
  if (authPromise === null) {
    authPromise = authBuilder();
  }
  return authPromise;
}
