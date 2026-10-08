import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import { ItemCard } from "../components/item-card";
import { useReadySession } from "../lib/session";

type Filter = "all" | "soon" | "expired" | "undated";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "soon", label: "ใกล้หมด" },
  { key: "expired", label: "หมดแล้ว" },
  { key: "undated", label: "ยังไม่ระบุวัน" },
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
    <section className="stack">
      <div className="row space-between">
        <h1>ของในบ้าน</h1>
        {items && <span className="muted">{items.length} รายการ</span>}
      </div>
      <input
        type="search"
        placeholder="ค้นหาชื่อของ"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="chips">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? "chip active" : "chip"}
            onClick={() =>
              navigate({ search: f.key === "all" ? {} : { filter: f.key } })
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      {items === undefined ? (
        <p className="muted">กำลังโหลด…</p>
      ) : visible.length === 0 ? (
        <div className="card">
          <p className="muted">
            {items.length === 0
              ? "ยังไม่มีของในรายการ กดเพิ่มเพื่อถ่ายรูปของชิ้นแรก"
              : "ไม่มีรายการที่ตรงกับตัวกรองนี้"}
          </p>
        </div>
      ) : (
        <ul className="list">
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
                <button
                  type="button"
                  className="ghost"
                  onClick={() => markUsed({ itemId: item.id, token })}
                >
                  ใช้แล้ว
                </button>
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
