import { siteOrigin } from "@/shell/site";
import { ISSUER } from "@/auth/vesper";

export const PROTECTED_RESOURCE_METADATA = {
  resource: siteOrigin,
  authorization_servers: [ISSUER],
  scopes_supported: ["entries:read"],
  bearer_methods_supported: ["header"],
  resource_name: "my knowledge",
};
