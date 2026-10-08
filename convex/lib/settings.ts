import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const DEFAULT_REMINDER_DAYS = 3;
export const DEFAULT_PIGGYBACK_DAYS = 2;

export type HouseholdSettings = Pick<
  Doc<"settings">,
  "piggybackDays" | "reminderDays"
>;

/** Settings with defaults applied; never null. */
export async function getSettings(
  ctx: QueryCtx | MutationCtx
): Promise<HouseholdSettings> {
  const row = await ctx.db.query("settings").first();
  return {
    piggybackDays: row?.piggybackDays ?? DEFAULT_PIGGYBACK_DAYS,
    reminderDays: row?.reminderDays ?? DEFAULT_REMINDER_DAYS,
  };
}

export async function ensureSettings(
  ctx: MutationCtx
): Promise<Doc<"settings">> {
  const row = await ctx.db.query("settings").first();
  if (row) {
    return row;
  }
  const id = await ctx.db.insert("settings", {
    piggybackDays: DEFAULT_PIGGYBACK_DAYS,
    reminderDays: DEFAULT_REMINDER_DAYS,
  });
  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error("settings insert failed");
  }
  return created;
}
