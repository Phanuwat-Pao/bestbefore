import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { CircleHelp, History, ListChecks, Plus, Settings } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { HeaderPreferences } from "@/components/preferences";
import { ReloadPrompt } from "@/components/reload-prompt";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dictionary } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export const Route = createRootRoute({ component: Root });

function Root() {
  const { state } = useSession();
  return (
    <>
      <Gate />
      {state.kind === "ready" && <ReloadPrompt />}
    </>
  );
}

function Gate() {
  const { state } = useSession();
  const { t } = useI18n();
  switch (state.kind) {
    case "loading": {
      return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <p className="text-muted-foreground text-center text-sm">
            {t.loggingIn}
          </p>
        </div>
      );
    }
    case "notMember": {
      return <NotMember retry={state.retry} />;
    }
    case "error": {
      return (
        <Centered>
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>{t.errorTitle}</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={state.retry} className="w-full">
                {t.retry}
              </Button>
            </CardContent>
          </Card>
        </Centered>
      );
    }
    case "ready": {
      return <Shell />;
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      {children}
    </div>
  );
}

function NotMember({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  const addFriendUrl = import.meta.env.VITE_LINE_ADD_FRIEND_URL;
  return (
    <Centered>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.notMemberTitle}</CardTitle>
          <CardDescription>{t.notMemberBody}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {addFriendUrl && (
            <Button asChild className="w-full">
              <a href={addFriendUrl} target="_blank" rel="noreferrer">
                {t.addFriend}
              </a>
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={retry}>
            {t.retry}
          </Button>
        </CardContent>
      </Card>
    </Centered>
  );
}

type NavKey = keyof Pick<
  Dictionary,
  "navList" | "navAdd" | "navHistory" | "navSettings" | "navHelp"
>;

const NAV: {
  to: "/" | "/add" | "/history" | "/settings" | "/help";
  key: NavKey;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { Icon: ListChecks, key: "navList", to: "/" },
  { Icon: Plus, key: "navAdd", to: "/add" },
  { Icon: History, key: "navHistory", to: "/history" },
  { Icon: Settings, key: "navSettings", to: "/settings" },
  { Icon: CircleHelp, key: "navHelp", to: "/help" },
];

function Shell() {
  const { t } = useI18n();
  return (
    <div className="bg-background min-h-dvh">
      <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Link
            to="/"
            className="text-primary text-lg font-bold tracking-tight"
          >
            {t.appName}
          </Link>
          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, key, Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="text-muted-foreground hover:bg-muted hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
              >
                <Icon className="size-4" />
                {t[key]}
              </Link>
            ))}
          </nav>
          <div className="ml-auto sm:ml-0">
            <HeaderPreferences />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-[calc(var(--tabbar-h)+1rem)] sm:pb-8">
        <Outlet />
      </main>
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <ul className="grid h-15 grid-cols-5">
          {NAV.map(({ to, key, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="text-muted-foreground data-[status=active]:text-primary flex h-full flex-col items-center justify-center gap-0.5 text-[11px]"
              >
                <Icon className="size-5" />
                {t[key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
