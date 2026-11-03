import { createFileRoute } from "@tanstack/react-router";

import { PROTECTED_RESOURCE_METADATA } from "@/auth/oauth";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: () =>
        Response.json(PROTECTED_RESOURCE_METADATA, {
          headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" },
        }),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
