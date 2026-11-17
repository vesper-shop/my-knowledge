import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { callback, SESSION_COOKIE, SESSION_SECONDS } from "@/auth/vesper";

export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state)
          return new Response(url.searchParams.get("error") || "Missing code.", { status: 400 });
        const { session, next } = await callback(
          env,
          new URL("/api/auth/callback", url).toString(),
          code,
          state,
        );
        return new Response(null, {
          status: 302,
          headers: {
            location: next,
            "set-cookie": `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
          },
        });
      },
    },
  },
});
