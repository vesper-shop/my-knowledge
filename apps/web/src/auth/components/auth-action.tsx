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

import { signIn as startSignIn, signOut as endSignOut, useOwner } from "@/auth/client";
import type { InterfaceMessages } from "@/i18n/registry";

export function AuthAction({ messages }: { messages: InterfaceMessages["shell"] }) {
  const { owner: session, isPending, profile } = useOwner();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(undefined), 5000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  async function signIn() {
    setError(undefined);
    startSignIn(window.location.pathname + window.location.search);
  }

  async function signOut() {
    setError(undefined);
    if (!(await endSignOut())) {
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
          {profile !== null && profile.image !== null ? (
            <AvatarImage alt="" src={profile.image} />
          ) : null}
          <AvatarFallback>{profile === null ? "?" : profile.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10}>
        {profile === null ? null : (
          <PopoverHeader>
            <a
              className="text-center hover:text-foreground"
              href={`https://${profile.handle}.noted-this.date/`}
              rel="noreferrer"
              target="_blank"
            >
              <PopoverTitle>{profile.name}</PopoverTitle>
              <PopoverDescription className="max-w-52 truncate">
                @{profile.handle}
              </PopoverDescription>
            </a>
          </PopoverHeader>
        )}
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
