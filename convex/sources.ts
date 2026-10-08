import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireMember } from "./lib/auth";

export const getInternal = internalQuery({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const source = await ctx.db.get(sourceId);
    return source
      ? { lineSourceId: source.lineSourceId, sourceType: source.sourceType }
      : null;
  },
});

export const setDisplayName = internalMutation({
  args: { displayName: v.string(), sourceId: v.id("sources") },
  handler: async (ctx, { displayName, sourceId }) => {
    const source = await ctx.db.get(sourceId);
    if (source) {
      await ctx.db.patch(sourceId, { displayName });
    }
    return null;
  },
});

/** Group chats the bot is in, for the piggyback toggle on the settings page. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const rows = await ctx.db.query("sources").take(100);
    return rows
      .filter((s) => s.active)
      .map((s) => ({
        displayName: s.displayName ?? null,
        id: s._id,
        lastPiggybackOn: s.lastPiggybackOn ?? null,
        piggybackEnabled: s.piggybackEnabled,
        sourceType: s.sourceType,
      }));
  },
});

export const setPiggyback = mutation({
  args: { enabled: v.boolean(), sourceId: v.id("sources"), token: v.string() },
  handler: async (ctx, { enabled, sourceId, token }) => {
    await requireMember(ctx, token);
    const source = await ctx.db.get(sourceId);
    if (!source) {
      throw new Error("ไม่พบแชทนี้");
    }
    await ctx.db.patch(sourceId, { piggybackEnabled: enabled });
    return null;
  },
});
