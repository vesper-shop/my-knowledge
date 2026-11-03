import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

import { verifyOwnerToken } from "@/auth/oauth";
import { createAuth } from "@/auth/server";
import type { Principal } from "@/auth/types";
import { requestCache } from "@/request";

export const getPrincipal = requestCache(async (): Promise<Principal> => {
  const requestHeaders = getRequestHeaders();
  if (!getSessionCookie(requestHeaders)) return "anonymous";
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session ? "owner" : "anonymous";
});

export async function isOwnerRequest(request: Request): Promise<boolean> {
  if (!request.headers.has("authorization")) return (await getPrincipal()) === "owner";
  return verifyOwnerToken(request);
}
