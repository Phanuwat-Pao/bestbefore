import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { ensureSettings, getSettings } from "./lib/settings";

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    return await getSettings(ctx);
  },
});

function clampDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(60, Math.max(0, Math.round(value)));
}

export const update = mutation({
  args: {
    piggybackDays: v.optional(v.number()),
    reminderDays: v.optional(v.number()),
    token: v.string(),
  },
  handler: async (ctx, { piggybackDays, reminderDays, token }) => {
    await requireMember(ctx, token);
    const row = await ensureSettings(ctx);
    await ctx.db.patch(row._id, {
      ...(piggybackDays === undefined
        ? {}
        : { piggybackDays: clampDays(piggybackDays) }),
      ...(reminderDays === undefined
        ? {}
        : { reminderDays: clampDays(reminderDays) }),
    });
    return null;
  },
});
