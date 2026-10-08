import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { purgeItem } from "./lib/items";

const DAY_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_RETENTION_DAYS = 30;
const WEBHOOK_EVENT_RETENTION_DAYS = 7;

/** Used and deleted items older than 30 days go for good, photo bytes included. */
export const purgeArchived = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ARCHIVE_RETENTION_DAYS * DAY_MS;
    for (const status of ["used", "deleted"] as const) {
      const old = await ctx.db
        .query("items")
        .withIndex("by_status_and_archivedAt", (q) =>
          q.eq("status", status).lt("archivedAt", cutoff)
        )
        .take(100);
      for (const item of old) {
        await purgeItem(ctx, item);
      }
    }
    return null;
  },
});

/** Webhook dedupe rows are only useful while LINE might still redeliver. */
export const purgeWebhookEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - WEBHOOK_EVENT_RETENTION_DAYS * DAY_MS;
    const old = await ctx.db
      .query("webhookEvents")
      .withIndex("by_receivedAt", (q) => q.lt("receivedAt", cutoff))
      .take(500);
    for (const row of old) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

const crons = cronJobs();

// 09:00 Asia/Bangkok. Web Push only; nothing goes to LINE from a cron.
crons.cron(
  "daily push digest",
  "0 2 * * *",
  internal.push.digest.sendDigest,
  {}
);
crons.cron(
  "purge archived items",
  "30 2 * * *",
  internal.crons.purgeArchived,
  {}
);
crons.cron(
  "purge webhook events",
  "45 2 * * *",
  internal.crons.purgeWebhookEvents,
  {}
);

export default crons;
