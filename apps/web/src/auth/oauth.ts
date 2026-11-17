import { ISSUER } from "@/auth/vesper";

export const PROTECTED_RESOURCE_METADATA = {
  resource: "https://knowledge.you-find.me",
  authorization_servers: [ISSUER],
  scopes_supported: ["entries:read"],
  bearer_methods_supported: ["header"],
  resource_name: "my knowledge",
};
