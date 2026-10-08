// Web login: a LIFF ID token is verified against LINE, then a session token is
// minted for a member (someone who follows the OA). Queries take the token as an
// argument; `requireMember` turns it back into a member.

import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { memberForToken, SESSION_TTL_MS } from "./lib/auth";
import { verifyIdToken } from "./lib/line";
import { ensureSettings, getSettings } from "./lib/settings";

export type LoginResult =
  | { kind: "ok"; token: string }
  | { kind: "notMember" }
  | { kind: "invalid"; reason: string };

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const login = action({
  args: { idToken: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, { idToken, userAgent }): Promise<LoginResult> => {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!channelId) {
      return {
        kind: "invalid",
        reason: "LINE_LOGIN_CHANNEL_ID not configured",
      };
    }
    const verified = await verifyIdToken(idToken, channelId);
    if (verified.kind === "invalid") {
      return { kind: "invalid", reason: verified.reason };
    }
    const token = randomToken();
    const created: { kind: "ok" } | { kind: "notMember" } =
      await ctx.runMutation(internal.auth.createSession, {
        displayName: verified.claims.name,
        lineUserId: verified.claims.sub,
        pictureUrl: verified.claims.picture,
        token,
        userAgent,
      });
    return created.kind === "ok" ? { kind: "ok", token } : created;
  },
});

export const createSession = internalMutation({
  args: {
    displayName: v.optional(v.string()),
    lineUserId: v.string(),
    pictureUrl: v.optional(v.string()),
    token: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ kind: "ok" } | { kind: "notMember" }> => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_lineUserId", (q) => q.eq("lineUserId", args.lineUserId))
      .unique();
    if (!member || member.status !== "following") {
      return { kind: "notMember" };
    }
    if (args.displayName && args.displayName !== member.displayName) {
      await ctx.db.patch(member._id, {
        displayName: args.displayName,
        pictureUrl: args.pictureUrl ?? member.pictureUrl,
      });
    }
    await ensureSettings(ctx);
    await ctx.db.insert("sessions", {
      expiresAt: Date.now() + SESSION_TTL_MS,
      memberId: member._id,
      token: args.token,
      userAgent: args.userAgent,
    });
    return { kind: "ok" };
  },
});

/** Who am I? Null when the token is unknown or the member left the OA. */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const member = await memberForToken(ctx, token);
    if (!member) {
      return null;
    }
    const settings = await getSettings(ctx);
    return {
      member: {
        displayName: member.displayName ?? null,
        id: member._id,
        pictureUrl: member.pictureUrl ?? null,
      },
      settings,
    };
  },
});

export const memberByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const member = await memberForToken(ctx, token);
    return member ? { id: member._id } : null;
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});
