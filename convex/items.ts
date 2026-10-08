// Pantry API for the web app. Every function takes the session token.

import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { parseIsoDate, todayInHousehold } from "./lib/dates";
import {
  archiveItem,
  listActiveItems,
  listArchivedItems,
  photosForItem,
  restoreItem,
  thumbnailFor,
  toView,
} from "./lib/items";
import { getSettings } from "./lib/settings";
import { guessValidator } from "./schema";

const MAX_PHOTOS = 6;

function requireDate(input: string): string {
  const parsed = parseIsoDate(input);
  if (!parsed) {
    throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
  }
  return parsed;
}

function requireName(input: string): string {
  const name = input.trim();
  if (name === "") {
    throw new Error("กรุณาใส่ชื่อของ");
  }
  return name.slice(0, 120);
}

async function requireItem(
  ctx: MutationCtx,
  itemId: Id<"items">
): Promise<Doc<"items">> {
  const item = await ctx.db.get(itemId);
  if (!item) {
    throw new Error("ไม่พบรายการนี้");
  }
  return item;
}

async function attachPhotos(
  ctx: MutationCtx,
  itemId: Id<"items">,
  storageIds: Id<"_storage">[],
  startAt: number
): Promise<void> {
  for (const [offset, storageId] of storageIds.slice(0, MAX_PHOTOS).entries()) {
    await ctx.db.insert("photos", {
      itemId,
      position: startAt + offset,
      storageId,
    });
  }
}

/** Active items, nearest expiry first, with a thumbnail each. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const settings = await getSettings(ctx);
    const rows = await listActiveItems(
      ctx,
      todayInHousehold(),
      settings.reminderDays
    );
    const out = [];
    for (const row of rows) {
      out.push({ ...row, thumbnailUrl: await thumbnailFor(ctx, row.id) });
    }
    return out;
  },
});

export const get = query({
  args: { itemId: v.string(), token: v.string() },
  handler: async (ctx, { itemId: rawId, token }) => {
    await requireMember(ctx, token);
    // Route params arrive as strings; an id from another table or garbage is "not found".
    const itemId = ctx.db.normalizeId("items", rawId);
    const item = itemId ? await ctx.db.get(itemId) : null;
    if (!item) {
      return null;
    }
    const settings = await getSettings(ctx);
    return {
      ...toView(item, todayInHousehold(), settings.reminderDays),
      photos: await photosForItem(ctx, item._id),
    };
  },
});

/** Used and deleted items, most recent first. Both can be restored. */
export const history = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const settings = await getSettings(ctx);
    const rows = await listArchivedItems(
      ctx,
      todayInHousehold(),
      settings.reminderDays
    );
    const out = [];
    for (const row of rows) {
      out.push({ ...row, thumbnailUrl: await thumbnailFor(ctx, row.id) });
    }
    return out;
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    expiresOn: v.optional(v.string()),
    guess: v.optional(guessValidator),
    name: v.string(),
    note: v.optional(v.string()),
    storageIds: v.array(v.id("_storage")),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx, args.token);
    const itemId = await ctx.db.insert("items", {
      addedBy: member._id,
      expiresOn:
        args.expiresOn === undefined ? undefined : requireDate(args.expiresOn),
      guess: args.guess,
      name: requireName(args.name),
      note: args.note?.trim() || undefined,
      status: "active",
    });
    await attachPhotos(ctx, itemId, args.storageIds, 0);
    return itemId;
  },
});

export const update = mutation({
  args: {
    expiresOn: v.optional(v.union(v.string(), v.null())),
    itemId: v.id("items"),
    name: v.optional(v.string()),
    note: v.optional(v.union(v.string(), v.null())),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token);
    await requireItem(ctx, args.itemId);
    await ctx.db.patch(args.itemId, {
      ...(args.name === undefined ? {} : { name: requireName(args.name) }),
      ...(args.expiresOn === undefined
        ? {}
        : {
            expiresOn:
              args.expiresOn === null ? undefined : requireDate(args.expiresOn),
          }),
      ...(args.note === undefined
        ? {}
        : {
            note:
              args.note === null ? undefined : args.note.trim() || undefined,
          }),
    });
    return null;
  },
});

export const markUsed = mutation({
  args: { itemId: v.id("items"), token: v.string() },
  handler: async (ctx, { itemId, token }) => {
    await requireMember(ctx, token);
    const item = await requireItem(ctx, itemId);
    if (item.status === "active") {
      await archiveItem(ctx, item, "used");
    }
    return null;
  },
});

export const remove = mutation({
  args: { itemId: v.id("items"), token: v.string() },
  handler: async (ctx, { itemId, token }) => {
    await requireMember(ctx, token);
    const item = await requireItem(ctx, itemId);
    if (item.status !== "deleted") {
      await archiveItem(ctx, item, "deleted");
    }
    return null;
  },
});

export const restore = mutation({
  args: { itemId: v.id("items"), token: v.string() },
  handler: async (ctx, { itemId, token }) => {
    await requireMember(ctx, token);
    const item = await requireItem(ctx, itemId);
    if (item.status !== "active") {
      await restoreItem(ctx, item);
    }
    return null;
  },
});

export const addPhotos = mutation({
  args: {
    itemId: v.id("items"),
    storageIds: v.array(v.id("_storage")),
    token: v.string(),
  },
  handler: async (ctx, { itemId, storageIds, token }) => {
    await requireMember(ctx, token);
    await requireItem(ctx, itemId);
    const existing = await ctx.db
      .query("photos")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .take(MAX_PHOTOS);
    const room = Math.max(0, MAX_PHOTOS - existing.length);
    await attachPhotos(ctx, itemId, storageIds.slice(0, room), existing.length);
    return null;
  },
});

export const removePhoto = mutation({
  args: { photoId: v.id("photos"), token: v.string() },
  handler: async (ctx, { photoId, token }) => {
    await requireMember(ctx, token);
    const photo = await ctx.db.get(photoId);
    if (!photo) {
      return null;
    }
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photoId);
    return null;
  },
});

/** Items the daily Web Push digest should mention. */
export const dueForReminder = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    const rows = await listActiveItems(
      ctx,
      todayInHousehold(),
      settings.reminderDays
    );
    return rows
      .filter((r) => r.daysLeft !== null && r.daysLeft <= settings.reminderDays)
      .map((r) => ({ daysLeft: r.daysLeft, name: r.name }));
  },
});
