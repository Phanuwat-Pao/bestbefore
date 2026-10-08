"use node";
// Daily Web Push digest. Runs from a cron and never touches LINE.

import webpush from "web-push";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { describeDaysLeft } from "../lib/dates";

function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!(publicKey && privateKey && subject)) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function statusCodeOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const code = error.statusCode;
    return typeof code === "number" ? code : null;
  }
  return null;
}

export const sendDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.runQuery(internal.items.dueForReminder, {});
    if (due.length === 0) {
      return null;
    }
    const subscriptions = await ctx.runQuery(
      internal.push.subscriptions.listAll,
      {}
    );
    if (subscriptions.length === 0) {
      return null;
    }
    const lines = due
      .slice(0, 5)
      .map((d) => `${d.name}: ${describeDaysLeft(d.daysLeft)}`);
    if (due.length > 5) {
      lines.push(`และอีก ${due.length - 5} รายการ`);
    }
    const payload = JSON.stringify({
      body: lines.join("\n"),
      title: `ของใกล้หมดอายุ ${due.length} รายการ`,
      url: "/?filter=soon",
    });

    if (!configureVapid()) {
      await ctx.runMutation(internal.push.subscriptions.recordNotification, {
        detail: "VAPID not configured",
        error: "VAPID not configured",
        itemCount: due.length,
      });
      return null;
    }

    let lastError: string | undefined;
    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        sent += 1;
      } catch (error) {
        const code = statusCodeOf(error);
        lastError = code === null ? String(error) : `HTTP ${code}`;
        if (code === 404 || code === 410) {
          await ctx.runMutation(internal.push.subscriptions.pruneEndpoint, {
            endpoint: sub.endpoint,
          });
        }
      }
    }
    await ctx.runMutation(internal.push.subscriptions.recordNotification, {
      detail: `sent to ${sent}/${subscriptions.length} devices`,
      error: lastError,
      itemCount: due.length,
    });
    return null;
  },
});
