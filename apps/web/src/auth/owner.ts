import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";
import { env } from "cloudflare:workers";

import { authBindingsSchema } from "@/auth/bindings";
import { verifyApiKey } from "@/auth/api-key";
import { verifyOwnerToken } from "@/auth/oauth";
import { createAuth } from "@/auth/server";
import type { Principal } from "@/auth/types";
import { requestCache } from "@/request";

export const getPrincipal = requestCache(async (): Promise<Principal> => {
  const requestHeaders = getRequestHeaders();
  if (!getSessionCookie(requestHeaders)) return "anonymous";
  const allowedEmail = authBindingsSchema.shape.ALLOWED_EMAIL.parse(env.ALLOWED_EMAIL);
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user.email.toLowerCase() === allowedEmail.toLowerCase() ? "owner" : "anonymous";
});

export async function isOwnerRequest(env: CloudflareEnv, request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (authorization === null) return (await getPrincipal()) === "owner";
  return authorization.split(".").length === 3
    ? verifyOwnerToken(request, authBindingsSchema.shape.ALLOWED_EMAIL.parse(env.ALLOWED_EMAIL))
    : verifyApiKey(request, env.API_KEY);
}
