// Outbound LINE calls. Default runtime (fetch only). Nothing here sends a push
// message; every reply uses a webhook reply token.

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getGroupName, getProfile, replyMessage } from "../lib/line";

export const reply = internalAction({
  args: { messages: v.array(v.any()), replyToken: v.string() },
  handler: async (_ctx, { messages, replyToken }) => {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      console.error("LINE_CHANNEL_ACCESS_TOKEN not configured; reply dropped");
      return null;
    }
    const result = await replyMessage(replyToken, messages, token);
    if (result.kind === "failed") {
      console.error("LINE reply failed", result.status, result.body);
    }
    return null;
  },
});

export const resolveProfile = internalAction({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return null;
    }
    const member = await ctx.runQuery(internal.members.getInternal, {
      memberId,
    });
    if (!member) {
      return null;
    }
    const profile = await getProfile(member.lineUserId, token);
    if (profile) {
      await ctx.runMutation(internal.members.setProfile, {
        displayName: profile.displayName,
        memberId,
        pictureUrl: profile.pictureUrl,
      });
    }
    return null;
  },
});

export const resolveSourceName = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return null;
    }
    const source = await ctx.runQuery(internal.sources.getInternal, {
      sourceId,
    });
    if (!source || source.sourceType !== "group") {
      return null;
    }
    const name = await getGroupName(source.lineSourceId, token);
    if (name) {
      await ctx.runMutation(internal.sources.setDisplayName, {
        displayName: name,
        sourceId,
      });
    }
    return null;
  },
});
