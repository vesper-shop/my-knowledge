import { useEffect, useState } from "react";
import { z } from "zod";

const profileSchema = z.object({
  handle: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});
const sessionSchema = z.object({
  owner: z.boolean(),
  profile: profileSchema.nullable(),
});

export function useOwner() {
  const [state, setState] = useState<{
    isPending: boolean;
    owner: boolean;
    profile: z.output<typeof profileSchema> | null;
  }>({ isPending: true, owner: false, profile: null });
  useEffect(() => {
    void fetch("/api/auth/session")
      .then(async (response) => sessionSchema.parse(await response.json()))
      .then(({ owner, profile }) => setState({ isPending: false, owner, profile }));
  }, []);
  return state;
}

export function signIn(next: string) {
  window.location.assign(`/api/auth/sign-in?next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  return (await fetch("/api/auth/sign-out", { method: "POST" })).ok;
}
