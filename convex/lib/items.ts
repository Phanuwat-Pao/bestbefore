// Pantry read/write helpers shared by the web API, the bot, and the reminder jobs.

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { ListFilter } from "./commands";
import type { IsoDate, Urgency } from "./dates";
import { daysBetween, parseIsoDate, urgencyOf } from "./dates";

export interface ItemView {
  id: Id<"items">;
  name: string;
  note: string | null;
  expiresOn: IsoDate | null;
  daysLeft: number | null;
  urgency: Urgency;
  status: Doc<"items">["status"];
  createdAt: number;
  archivedAt: number | null;
  guess: Doc<"items">["guess"] | null;
}

const ACTIVE_LIMIT = 500;
const HISTORY_LIMIT = 200;

export function toView(
  item: Doc<"items">,
  today: IsoDate,
  soonDays: number
): ItemView {
  const expiresOn =
    item.expiresOn === undefined ? null : parseIsoDate(item.expiresOn);
  const daysLeft = expiresOn === null ? null : daysBetween(today, expiresOn);
  return {
    archivedAt: item.archivedAt ?? null,
    createdAt: item._creationTime,
    daysLeft,
    expiresOn,
    guess: item.guess ?? null,
    id: item._id,
    name: item.name,
    note: item.note ?? null,
    status: item.status,
    urgency: urgencyOf(daysLeft, soonDays),
  };
}

/** Dated items nearest expiry first, then undated items newest first. */
export function sortForList(rows: ItemView[]): ItemView[] {
  return rows.toSorted((a, b) => {
    if (a.expiresOn === null && b.expiresOn === null) {
      return b.createdAt - a.createdAt;
    }
    if (a.expiresOn === null) {
      return 1;
    }
    if (b.expiresOn === null) {
      return -1;
    }
    return a.expiresOn < b.expiresOn ? -1 : a.expiresOn > b.expiresOn ? 1 : 0;
  });
}

export async function listActiveItems(
  ctx: QueryCtx | MutationCtx,
  today: IsoDate,
  soonDays: number
): Promise<ItemView[]> {
  const rows = await ctx.db
    .query("items")
    .withIndex("by_status_and_expiresOn", (q) => q.eq("status", "active"))
    .take(ACTIVE_LIMIT);
  return sortForList(rows.map((row) => toView(row, today, soonDays)));
}

export function applyFilter(rows: ItemView[], filter: ListFilter): ItemView[] {
  switch (filter) {
    case "all": {
      return rows;
    }
    case "soon": {
      return rows.filter(
        (r) =>
          r.urgency === "expired" ||
          r.urgency === "today" ||
          r.urgency === "soon"
      );
    }
    case "expired": {
      return rows.filter(
        (r) => r.urgency === "expired" || r.urgency === "today"
      );
    }
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

/** Used and deleted items, most recently archived first. */
export async function listArchivedItems(
  ctx: QueryCtx | MutationCtx,
  today: IsoDate,
  soonDays: number
): Promise<ItemView[]> {
  const used = await ctx.db
    .query("items")
    .withIndex("by_status_and_archivedAt", (q) => q.eq("status", "used"))
    .order("desc")
    .take(HISTORY_LIMIT);
  const deleted = await ctx.db
    .query("items")
    .withIndex("by_status_and_archivedAt", (q) => q.eq("status", "deleted"))
    .order("desc")
    .take(HISTORY_LIMIT);
  return [...used, ...deleted]
    .map((row) => toView(row, today, soonDays))
    .toSorted((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
    .slice(0, HISTORY_LIMIT);
}

export interface PhotoView {
  photoId: Id<"photos">;
  url: string | null;
}

export async function photosForItem(
  ctx: QueryCtx | MutationCtx,
  itemId: Id<"items">
): Promise<PhotoView[]> {
  const photos = await ctx.db
    .query("photos")
    .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
    .take(20);
  const out: PhotoView[] = [];
  for (const photo of photos.toSorted((a, b) => a.position - b.position)) {
    out.push({
      photoId: photo._id,
      url: await ctx.storage.getUrl(photo.storageId),
    });
  }
  return out;
}

export async function thumbnailFor(
  ctx: QueryCtx | MutationCtx,
  itemId: Id<"items">
): Promise<string | null> {
  const first = await ctx.db
    .query("photos")
    .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
    .first();
  return first ? await ctx.storage.getUrl(first.storageId) : null;
}

export async function archiveItem(
  ctx: MutationCtx,
  item: Doc<"items">,
  status: "used" | "deleted"
): Promise<void> {
  await ctx.db.patch(item._id, { archivedAt: Date.now(), status });
}

export async function restoreItem(
  ctx: MutationCtx,
  item: Doc<"items">
): Promise<void> {
  await ctx.db.patch(item._id, { archivedAt: undefined, status: "active" });
}

/** Remove an item and its photo bytes for good. */
export async function purgeItem(
  ctx: MutationCtx,
  item: Doc<"items">
): Promise<void> {
  const photos = await ctx.db
    .query("photos")
    .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
    .take(50);
  for (const photo of photos) {
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photo._id);
  }
  await ctx.db.delete(item._id);
}
