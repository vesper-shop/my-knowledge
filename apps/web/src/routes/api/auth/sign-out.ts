import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

import { endSession, SESSION_COOKIE } from "@/auth/vesper";

export const Route = createFileRoute("/api/auth/sign-out")({
  server: {
    handlers: {
      POST: async () => {
        const session = getCookie(SESSION_COOKIE);
        if (session) await endSession(env.KNOWLEDGE_CACHE, session);
        return Response.json(
          { signedOut: true },
          {
            headers: {
              "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
            },
          },
        );
      },
    },
  },
});
