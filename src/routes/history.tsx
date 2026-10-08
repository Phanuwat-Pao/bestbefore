import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import { ItemCard } from "../components/item-card";
import { useReadySession } from "../lib/session";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const { token } = useReadySession();
  const rows = useQuery(api.items.history, { token });
  const restore = useMutation(api.items.restore);

  return (
    <section className="stack">
      <h1>ประวัติ</h1>
      <p className="muted small">
        ของที่ใช้แล้วหรือลบแล้ว กู้คืนได้ภายใน 30 วัน หลังจากนั้นระบบจะลบถาวรพร้อมรูป
      </p>
      {rows === undefined ? (
        <p className="muted">กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <div className="card">
          <p className="muted">ยังไม่มีประวัติ</p>
        </div>
      ) : (
        <ul className="list">
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
                <button
                  type="button"
                  className="ghost"
                  onClick={() => restore({ itemId: row.id, token })}
                >
                  กู้คืน
                </button>
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
