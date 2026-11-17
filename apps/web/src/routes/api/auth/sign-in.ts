import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { authorize } from "@/auth/vesper";

export const Route = createFileRoute("/api/auth/sign-in")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const next = url.searchParams.get("next");
        const target = await authorize(
          env,
          new URL("/api/auth/callback", url).toString(),
          next && next.startsWith("/") && !next.startsWith("//") ? next : "/",
        );
        return Response.redirect(target, 302);
      },
    },
  },
});
