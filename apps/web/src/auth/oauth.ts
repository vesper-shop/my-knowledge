import { requestToResourceInput, verifyAccessTokenRequest } from "better-auth/oauth2";

const ISSUER = "https://you-find.me/api/auth";
const AUDIENCE = "https://knowledge.you-find.me";

export async function verifyOwnerToken(request: Request): Promise<boolean> {
  await verifyAccessTokenRequest(requestToResourceInput(request), {
    verifyOptions: { issuer: ISSUER, audience: AUDIENCE },
    requiredScopes: ["knowledge:write"],
    jwksUrl: `${ISSUER}/jwks`,
  });
  return true;
}
