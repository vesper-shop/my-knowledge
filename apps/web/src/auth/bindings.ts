import { z } from "zod";

export const authBindingsSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  YOU_FIND_ME_CLIENT_SECRET: z.string().min(1),
});
