import { requestToResourceInput, verifyAccessTokenRequest } from "better-auth/oauth2";
import { APIError } from "better-call";

const ISSUER = "https://you-find.me/api/auth";
const RESOURCE = "https://knowledge.you-find.me";

export const RESOURCE_SERVER = {
  issuer: ISSUER,
  audience: RESOURCE,
  jwksUrl: `${ISSUER}/jwks`,
  requiredScopes: ["knowledge:write"],
};

export const PROTECTED_RESOURCE_METADATA = {
  resource: RESOURCE,
  authorization_servers: [ISSUER],
  scopes_supported: ["knowledge:read", "knowledge:write"],
  bearer_methods_supported: ["header"],
  resource_name: "my knowledge",
};

export async function verifyOwnerToken(request: Request): Promise<boolean> {
  try {
    await verifyAccessTokenRequest(requestToResourceInput(request), {
      verifyOptions: { issuer: RESOURCE_SERVER.issuer, audience: RESOURCE_SERVER.audience },
      requiredScopes: RESOURCE_SERVER.requiredScopes,
      jwksUrl: RESOURCE_SERVER.jwksUrl,
    });
    return true;
  } catch (error) {
    if (error instanceof APIError) return false;
    throw error;
  }
}
