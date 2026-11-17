import { createFileRoute } from "@tanstack/react-router";

import { getPrincipal, getProfile } from "@/auth/owner";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { owner: (await getPrincipal()) === "owner", profile: await getProfile() },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
