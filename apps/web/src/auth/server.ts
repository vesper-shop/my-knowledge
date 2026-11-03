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
  return betterAuth<BetterAuthOptions>({
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "you-find-me",
            name: "you-find.me",
            discoveryUrl: "https://you-find.me/api/auth/.well-known/openid-configuration",
            clientId: "knowledge",
            scopes: ["openid", "profile", "email"],
            tokenEndpointAuth: { method: "none" },
            pkce: true,
            disableSignUp: true,
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
      accountLinking: { enabled: false },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
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
