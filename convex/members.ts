import { v } from "convex/values";

import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireMember } from "./lib/auth";

export const getInternal = internalQuery({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    return member ? { lineUserId: member.lineUserId } : null;
  },
});

export const setProfile = internalMutation({
  args: {
    displayName: v.string(),
    memberId: v.id("members"),
    pictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, { displayName, memberId, pictureUrl }) => {
    const member = await ctx.db.get(memberId);
    if (member) {
      await ctx.db.patch(memberId, { displayName, pictureUrl });
    }
    return null;
  },
});

/** Household members: everyone currently following the OA. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const rows = await ctx.db.query("members").take(200);
    return rows
      .filter((m) => m.status === "following")
      .map((m) => ({
        displayName: m.displayName ?? null,
        followedAt: m.followedAt,
        id: m._id,
        pictureUrl: m.pictureUrl ?? null,
      }));
  },
});
