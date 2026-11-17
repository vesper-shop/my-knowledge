import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/img/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const object = await env.KNOWLEDGE_BUCKET.get(`knowledge/img/${params.name}`);
        if (!object) return new Response("Not found", { status: 404 });
        const headers = new Headers({ "cache-control": "public, max-age=31536000, immutable" });
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        return new Response(object.body, { headers });
      },
    },
  },
});
