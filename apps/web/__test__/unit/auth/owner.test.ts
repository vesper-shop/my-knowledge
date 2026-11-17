import { expect, it } from "vite-plus/test";

import { isSession } from "@/auth/vesper";

const cache = { get: async (key: string) => (key === "session:good" ? "owner" : null) };

it("accepts only sessions stored in KV", async () => {
  expect(await isSession(cache, "good")).toBe(true);
  expect(await isSession(cache, "forged")).toBe(false);
  expect(await isSession(cache, undefined)).toBe(false);
});
