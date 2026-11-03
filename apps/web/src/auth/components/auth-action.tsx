import { Avatar, AvatarFallback, AvatarImage } from "@my-knowledge/ui/components/avatar";
import { Button } from "@my-knowledge/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@my-knowledge/ui/components/popover";
import { LogIn, LogOut } from "@my-knowledge/ui/icons";
import { useEffect, useState } from "react";

import { authClient } from "@/auth/client";
import type { InterfaceMessages } from "@/i18n/registry";

export function AuthAction({ messages }: { messages: InterfaceMessages["shell"] }) {
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(undefined), 5000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  async function signIn() {
    setError(undefined);
    const response = await authClient.signIn.social({
      provider: "you-find-me",
      callbackURL: window.location.pathname + window.location.search,
    });
    if (response.error) setError(messages.signInFailed);
  }

  async function signOut() {
    setError(undefined);
    const response = await authClient.signOut();
    if (response.error) {
      setError(messages.signOutFailed);
      return;
    }
    window.location.assign("/");
  }

  if (isPending) return null;

  if (!session) {
    return (
      <Button
        aria-label={messages.signIn}
        onClick={signIn}
        size="icon-sm"
        title={error ?? messages.signIn}
        variant="ghost"
      >
        <LogIn />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button aria-label={messages.accountMenu} size="icon-sm" variant="ghost" />}
      >
        <Avatar size="sm">
          {session.user.image ? <AvatarImage alt="" src={session.user.image} /> : null}
          <AvatarFallback>{session.user.name.slice(0, 1).toLocaleUpperCase()}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10}>
        <PopoverHeader>
          <PopoverTitle>{session.user.name}</PopoverTitle>
          <PopoverDescription className="max-w-52 truncate">
            {session.user.email}
          </PopoverDescription>
        </PopoverHeader>
        <Button className="w-full" onClick={signOut} size="sm" variant="outline">
          <LogOut data-icon="inline-start" />
          {messages.signOut}
        </Button>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
