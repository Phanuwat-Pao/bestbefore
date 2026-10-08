import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireMember } from "../lib/auth";

const keysValidator = v.object({ auth: v.string(), p256dh: v.string() });

export const save = mutation({
  args: {
    endpoint: v.string(),
    keys: keysValidator,
    token: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { endpoint, keys, token, userAgent }) => {
    const member = await requireMember(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        keys,
        memberId: member._id,
        userAgent,
      });
      return null;
    }
    await ctx.db.insert("pushSubscriptions", {
      endpoint,
      keys,
      memberId: member._id,
      userAgent,
    });
    return null;
  },
});

export const remove = mutation({
  args: { endpoint: v.string(), token: v.string() },
  handler: async (ctx, { endpoint, token }) => {
    await requireMember(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/** The caller's own devices, for the settings page. */
export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const member = await requireMember(ctx, token);
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
      .take(50);
    return rows.map((r) => ({
      endpoint: r.endpoint,
      userAgent: r.userAgent ?? null,
    }));
  },
});

export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pushSubscriptions").take(500);
    return rows.map((r) => ({ endpoint: r.endpoint, keys: r.keys }));
  },
});

export const pruneEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const recordNotification = internalMutation({
  args: {
    detail: v.string(),
    error: v.optional(v.string()),
    itemCount: v.number(),
  },
  handler: async (ctx, { detail, error, itemCount }) => {
    await ctx.db.insert("notifications", {
      detail,
      error,
      itemCount,
      kind: "push",
      sentAt: Date.now(),
    });
    return null;
  },
});
