import { getCookie } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

import type { Principal } from "@/auth/types";
import { isOwner, isSession, PROFILE_KEY, SESSION_COOKIE } from "@/auth/vesper";
import { requestCache } from "@/request";

export const getPrincipal = requestCache(async (): Promise<Principal> => {
  return (await isSession(env.KNOWLEDGE_CACHE, getCookie(SESSION_COOKIE))) ? "owner" : "anonymous";
});

export const getProfile = requestCache(async () => {
  if (!(await isSession(env.KNOWLEDGE_CACHE, getCookie(SESSION_COOKIE)))) return null;
  return env.KNOWLEDGE_CACHE.get(PROFILE_KEY, "json");
});

export async function isOwnerRequest(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization");
  if (!header) return (await getPrincipal()) === "owner";
  return header.startsWith("Bearer ") && isOwner(env, header.slice("Bearer ".length));
}
