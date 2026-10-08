import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Resolve a web session token to its member, or null when it is missing, expired, or the member left. */
export async function memberForToken(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"members"> | null> {
  if (token === "") {
    return null;
  }
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  const member = await ctx.db.get(session.memberId);
  if (!member || member.status !== "following") {
    return null;
  }
  return member;
}

/** Authorize a web request. Throws a Thai message the UI can show as-is. */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"members">> {
  const member = await memberForToken(ctx, token);
  if (!member) {
    throw new Error("กรุณาเข้าสู่ระบบใหม่");
  }
  return member;
}
