import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ItemCard } from "@/components/item-card";
import { EmptyState, Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Dictionary } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { useReadySession } from "@/lib/session";

import { api } from "../../convex/_generated/api";

type Filter = "all" | "soon" | "expired" | "undated";
type FilterKey = keyof Pick<
  Dictionary,
  "filterAll" | "filterSoon" | "filterExpired" | "filterUndated"
>;

const FILTERS: { key: Filter; label: FilterKey }[] = [
  { key: "all", label: "filterAll" },
  { key: "soon", label: "filterSoon" },
  { key: "expired", label: "filterExpired" },
  { key: "undated", label: "filterUndated" },
];

function parseFilter(value: unknown): Filter {
  return value === "soon" || value === "expired" || value === "undated"
    ? value
    : "all";
}

export const Route = createFileRoute("/")({
  component: ListPage,
  validateSearch: (search: Record<string, unknown>): { filter?: Filter } => {
    const filter = parseFilter(search.filter);
    return filter === "all" ? {} : { filter };
  },
});

function ListPage() {
  const { t } = useI18n();
  const { token } = useReadySession();
  const { filter = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const items = useQuery(api.items.list, { token });
  const markUsed = useMutation(api.items.markUsed);
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    if (!items) {
      return [];
    }
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) {
        return false;
      }
      switch (filter) {
        case "all": {
          return true;
        }
        case "soon": {
          return (
            item.urgency === "expired" ||
            item.urgency === "today" ||
            item.urgency === "soon"
          );
        }
        case "expired": {
          return item.urgency === "expired" || item.urgency === "today";
        }
        case "undated": {
          return item.expiresOn === null;
        }
        default: {
          const _exhaustive: never = filter;
          return _exhaustive;
        }
      }
    });
  }, [items, filter, search]);

  return (
    <Page
      title={t.listTitle}
      aside={
        <Button asChild size="sm" className="sm:hidden">
          <Link to="/add">
            <Plus data-icon="inline-start" />
            {t.navAdd}
          </Link>
        </Button>
      }
    >
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder={t.searchPlaceholder}
          className="h-10 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Tabs
        value={filter}
        onValueChange={(value) => {
          const next = parseFilter(value);
          navigate({ search: next === "all" ? {} : { filter: next } });
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {t[f.label]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {items === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-22 w-full" />
          <Skeleton className="h-22 w-full" />
          <Skeleton className="h-22 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3">
              <p>{t.emptyList}</p>
              <Button asChild>
                <Link to="/add">
                  <Plus data-icon="inline-start" />
                  {t.addFirst}
                </Link>
              </Button>
            </div>
          ) : (
            t.emptyFilter
          )}
        </EmptyState>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {t.itemCount(visible.length)}
          </p>
          <ul className="flex flex-col gap-2">
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                expiresOn={item.expiresOn}
                daysLeft={item.daysLeft}
                urgency={item.urgency}
                thumbnailUrl={item.thumbnailUrl}
                trailing={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markUsed({ itemId: item.id, token })}
                    aria-label={t.usedAria(item.name)}
                  >
                    <Check data-icon="inline-start" />
                    {t.used}
                  </Button>
                }
              />
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
