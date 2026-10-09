import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Undo2 } from "lucide-react";

import { ItemCard } from "@/components/item-card";
import { EmptyState, Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useReadySession } from "@/lib/session";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const { t, locale } = useI18n();
  const { token } = useReadySession();
  const rows = useQuery(api.items.history, { token });
  const restore = useMutation(api.items.restore);
  const dateLocale = locale === "th" ? "th-TH" : "en-GB";

  return (
    <Page title={t.historyTitle}>
      <p className="text-muted-foreground text-sm">{t.historyHint}</p>
      {rows === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-22 w-full" />
          <Skeleton className="h-22 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState>{t.historyEmpty}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <ItemCard
              key={row.id}
              id={row.id}
              name={row.name}
              expiresOn={row.expiresOn}
              daysLeft={row.daysLeft}
              urgency={row.urgency}
              thumbnailUrl={row.thumbnailUrl}
              subtitle={`${row.status === "used" ? t.statusUsed : t.statusDeleted}${
                row.archivedAt
                  ? ` ${new Date(row.archivedAt).toLocaleDateString(dateLocale)}`
                  : ""
              }`}
              trailing={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restore({ itemId: row.id, token })}
                  aria-label={t.restoreAria(row.name)}
                >
                  <Undo2 data-icon="inline-start" />
                  {t.restore}
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </Page>
  );
}
