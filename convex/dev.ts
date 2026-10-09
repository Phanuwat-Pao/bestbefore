// Dev-only helper: mint a web session for a member without going through LINE
// Login, so the UI can be exercised from a desktop browser or a screenshot run.
// Internal, so it is not callable from the client.

import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { SESSION_TTL_MS } from "./lib/auth";
import { purgeItem } from "./lib/items";

export const mint = internalMutation({
  args: { memberId: v.id("members"), token: v.string() },
  handler: async (ctx, { memberId, token }) => {
    const member = await ctx.db.get(memberId);
    if (!member) {
      throw new Error("member not found");
    }
    await ctx.db.insert("sessions", {
      expiresAt: Date.now() + SESSION_TTL_MS,
      memberId,
      token,
      userAgent: "dev-session",
    });
    return null;
  },
});

/** Dev only: hard-delete items (and their photos) regardless of status. */
export const purgeItems = internalMutation({
  args: { itemIds: v.array(v.id("items")) },
  handler: async (ctx, { itemIds }) => {
    for (const itemId of itemIds) {
      const item = await ctx.db.get(itemId);
      if (item) {
        await purgeItem(ctx, item);
      }
    }
    return null;
  },
});
