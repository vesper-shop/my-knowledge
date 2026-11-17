import { z } from "zod";

const VESPER_ORIGIN = "https://noted-this.date";
const RESOURCE = `${VESPER_ORIGIN}/mcp`;
const SCOPE = "entries:read";
const CLIENT_KEY = "vesper:client";
const HEADERS = { "user-agent": "my-knowledge" };

export const ISSUER = `${VESPER_ORIGIN}/api/auth`;
export const SESSION_COOKIE = "knowledge_session";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

const metadataSchema = z.object({
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  registration_endpoint: z.string(),
});
const clientSchema = z.object({ client_id: z.string(), redirect_uri: z.string() });
const pendingSchema = z.object({ verifier: z.string(), next: z.string() });
const tokenSchema = z.object({ access_token: z.string() });
const workspaceSchema = z.object({
  workspace: z.object({ id: z.string(), handle: z.string() }),
  profile: z.object({ name: z.string(), image: z.string().nullable() }),
});
export const PROFILE_KEY = "vesper:profile";
const OWNER_KEY = "vesper:owner-workspace";

async function read<S extends z.ZodType>(schema: S, response: Response): Promise<z.output<S>> {
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
  return schema.parse(await response.json());
}

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

const metadata = async () =>
  read(
    metadataSchema,
    await fetch(`${VESPER_ORIGIN}/.well-known/oauth-authorization-server/api/auth`, {
      headers: HEADERS,
    }),
  );

async function client(env: CloudflareEnv, redirectUri: string) {
  const cache = env.KNOWLEDGE_CACHE;
  const saved = clientSchema.safeParse(await cache.get(CLIENT_KEY, "json"));
  if (saved.success && saved.data.redirect_uri === redirectUri) return saved.data;
  const { registration_endpoint } = await metadata();
  const registered = await read(
    z.object({ client_id: z.string() }),
    await fetch(registration_endpoint, {
      method: "POST",
      headers: { ...HEADERS, "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "My Knowledge",
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: SCOPE,
      }),
    }),
  );
  const result = { client_id: registered.client_id, redirect_uri: redirectUri };
  await cache.put(CLIENT_KEY, JSON.stringify(result));
  return result;
}

export async function authorize(env: CloudflareEnv, redirectUri: string, next: string) {
  const cache = env.KNOWLEDGE_CACHE;
  const [{ authorization_endpoint }, registered] = await Promise.all([
    metadata(),
    client(env, redirectUri),
  ]);
  const state = random();
  const verifier = random();
  const challenge = base64url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  await cache.put(`vesper:pending:${state}`, JSON.stringify({ verifier, next }), {
    expirationTtl: 600,
  });
  const url = new URL(authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: registered.client_id,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: RESOURCE,
  }).toString();
  return url.toString();
}

async function workspace(token: string) {
  const response = await fetch(`${VESPER_ORIGIN}/api/workspace`, {
    headers: { ...HEADERS, authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return workspaceSchema.parse(await response.json());
}

export async function callback(
  env: CloudflareEnv,
  redirectUri: string,
  code: string,
  state: string,
) {
  const cache = env.KNOWLEDGE_CACHE;
  const pending = pendingSchema.parse(await cache.get(`vesper:pending:${state}`, "json"));
  await cache.delete(`vesper:pending:${state}`);
  const [{ token_endpoint }, registered] = await Promise.all([
    metadata(),
    client(env, redirectUri),
  ]);
  const tokens = await read(
    tokenSchema,
    await fetch(token_endpoint, {
      method: "POST",
      headers: { ...HEADERS, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: registered.client_id,
        code_verifier: pending.verifier,
        resource: RESOURCE,
      }),
    }),
  );
  const me = await workspace(tokens.access_token);
  if (!me || me.workspace.id !== (await ownerId(env)))
    throw new Error("This Vesper workspace is not the one this site belongs to.");
  await cache.put(
    PROFILE_KEY,
    JSON.stringify({
      handle: me.workspace.handle,
      name: me.profile.name,
      image: me.profile.image,
    }),
  );
  const session = random();
  await cache.put(`session:${session}`, "owner", { expirationTtl: SESSION_SECONDS });
  return { session, next: pending.next };
}

async function ownerId(env: CloudflareEnv) {
  const cache = env.KNOWLEDGE_CACHE;
  const cached = await cache.get(OWNER_KEY);
  if (cached) return cached;
  const response = await fetch(`${VESPER_ORIGIN}/api/workspace`, {
    headers: { ...HEADERS, authorization: `Bearer ${env.VESPER_TOKEN}` },
  });
  if (!response.ok) return null;
  const id = (await read(workspaceSchema, response)).workspace.id;
  await cache.put(OWNER_KEY, id, { expirationTtl: 3600 });
  return id;
}

export const isSession = async (
  cache: { get(key: string): Promise<string | null> },
  session: string | undefined,
) => session !== undefined && (await cache.get(`session:${session}`)) === "owner";

export const endSession = (cache: KVNamespace, session: string) =>
  cache.delete(`session:${session}`);

export async function isOwner(env: CloudflareEnv, token: string) {
  const cache = env.KNOWLEDGE_CACHE;
  const key = `bearer:${base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached === "owner";
  const me = await workspace(token);
  const owner = me !== null && me.workspace.id === (await ownerId(env));
  await cache.put(key, owner ? "owner" : "other", { expirationTtl: 300 });
  return owner;
}
