import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Undo2 } from "lucide-react";

import { ItemCard } from "@/components/item-card";
import { EmptyState, Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadySession } from "@/lib/session";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const { token } = useReadySession();
  const rows = useQuery(api.items.history, { token });
  const restore = useMutation(api.items.restore);

  return (
    <Page title="ประวัติ">
      <p className="text-muted-foreground text-sm">
        ของที่ใช้แล้วหรือลบแล้ว กู้คืนได้ภายใน 30 วัน หลังจากนั้นระบบจะลบถาวรพร้อมรูป
      </p>
      {rows === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-22 w-full" />
          <Skeleton className="h-22 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState>ยังไม่มีประวัติ</EmptyState>
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
              subtitle={`${row.status === "used" ? "ใช้แล้ว" : "ลบแล้ว"}${
                row.archivedAt
                  ? ` ${new Date(row.archivedAt).toLocaleDateString("th-TH")}`
                  : ""
              }`}
              trailing={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restore({ itemId: row.id, token })}
                  aria-label={`กู้คืน ${row.name}`}
                >
                  <Undo2 data-icon="inline-start" />
                  กู้คืน
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </Page>
  );
}
