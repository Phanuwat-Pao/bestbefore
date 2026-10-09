// LINE webhook ingest. One transaction per event: dedupe, update members/sources/
// items, then schedule the reply. Replies go out through `lineSend.reply` right
// after commit, well inside the reply token's one-minute window.

import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Command } from "../lib/commands";
import { mentionsBot, parseCommand, stripBotMentions } from "../lib/commands";
import { addDays, todayInHousehold } from "../lib/dates";
import type { ChatSource, LineEvent } from "../lib/events";
import { parseLineEvent, parsePostbackData } from "../lib/events";
import type { ItemRow, LineMessage } from "../lib/flex";
import {
  confirmDeleteMessage,
  helpMessage,
  historyMessage,
  joinMessage,
  listMessage,
  photoHintMessage,
  piggybackMessage,
  textMessage,
  welcomeMessage,
} from "../lib/flex";
import type { ItemView } from "../lib/items";
import {
  applyFilter,
  archiveItem,
  listActiveItems,
  listArchivedItems,
} from "../lib/items";
import { getSettings } from "../lib/settings";

export const ingestEvents = internalMutation({
  args: { events: v.array(v.any()) },
  handler: async (ctx, { events }) => {
    for (const raw of events) {
      const event = parseLineEvent(raw);
      if (!event) {
        continue;
      }
      try {
        await handleEvent(ctx, event);
      } catch (error) {
        console.error(
          "line event failed",
          event.type,
          event.webhookEventId,
          error
        );
      }
    }
    return null;
  },
});

function liffUrl(): string {
  const liffId = process.env.LIFF_ID;
  return liffId ? `https://liff.line.me/${liffId}` : "https://liff.line.me";
}

async function handleEvent(ctx: MutationCtx, event: LineEvent): Promise<void> {
  const seen = await ctx.db
    .query("webhookEvents")
    .withIndex("by_webhookEventId", (q) =>
      q.eq("webhookEventId", event.webhookEventId)
    )
    .first();
  if (seen) {
    return;
  }
  await ctx.db.insert("webhookEvents", {
    receivedAt: event.timestamp,
    webhookEventId: event.webhookEventId,
  });

  switch (event.type) {
    case "follow": {
      await onFollow(ctx, event.source, event.replyToken);
      return;
    }
    case "unfollow": {
      await onUnfollow(ctx, event.source);
      return;
    }
    case "join": {
      await onJoin(ctx, event.source, event.replyToken);
      return;
    }
    case "leave": {
      await onLeave(ctx, event.source);
      return;
    }
    case "message": {
      await onMessage(ctx, event);
      return;
    }
    case "postback": {
      await onPostback(ctx, event.data, event.replyToken);
      break;
    }
    case "ignored": {
      break;
    }
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

async function reply(
  ctx: MutationCtx,
  replyToken: string | undefined,
  messages: LineMessage[]
): Promise<void> {
  if (!replyToken || messages.length === 0) {
    return;
  }
  await ctx.scheduler.runAfter(0, internal.line.send.reply, {
    messages,
    replyToken,
  });
}

// ---- Members (1:1) ----

/**
 * Make sure a LINE user is a following member. Called on `follow`, and on any
 * 1:1 message: being able to message the OA proves friendship, which covers
 * people who followed before the webhook existed (the channel owner, for one).
 */
async function ensureMember(
  ctx: MutationCtx,
  lineUserId: string
): Promise<{ memberId: Id<"members">; isNew: boolean }> {
  const existing = await ctx.db
    .query("members")
    .withIndex("by_lineUserId", (q) => q.eq("lineUserId", lineUserId))
    .unique();
  if (existing) {
    if (existing.status !== "following") {
      await ctx.db.patch(existing._id, {
        followedAt: Date.now(),
        status: "following",
      });
    }
    return { isNew: false, memberId: existing._id };
  }
  const memberId = await ctx.db.insert("members", {
    followedAt: Date.now(),
    lineUserId,
    status: "following",
  });
  await ctx.scheduler.runAfter(0, internal.line.send.resolveProfile, {
    memberId,
  });
  return { isNew: true, memberId };
}

async function onFollow(
  ctx: MutationCtx,
  source: ChatSource,
  replyToken: string | undefined
): Promise<void> {
  if (source.kind !== "user") {
    return;
  }
  const member = await ensureMember(ctx, source.userId);
  if (!member.isNew) {
    await ctx.db.patch(member.memberId, { followedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.line.send.resolveProfile, {
      memberId: member.memberId,
    });
  }
  await reply(ctx, replyToken, [welcomeMessage(liffUrl())]);
}

async function onUnfollow(ctx: MutationCtx, source: ChatSource): Promise<void> {
  if (source.kind !== "user") {
    return;
  }
  const member = await ctx.db
    .query("members")
    .withIndex("by_lineUserId", (q) => q.eq("lineUserId", source.userId))
    .unique();
  if (!member) {
    return;
  }
  await ctx.db.patch(member._id, { status: "left" });
  // Leaving the OA ends web access too: sessions and push subscriptions go.
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
    .take(100);
  for (const session of sessions) {
    await ctx.db.delete(session._id);
  }
  const subs = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
    .take(100);
  for (const sub of subs) {
    await ctx.db.delete(sub._id);
  }
}

// ---- Sources (group / room) ----

function sourceKey(
  source: ChatSource
): { id: string; type: "group" | "room" } | null {
  if (source.kind === "group") {
    return { id: source.groupId, type: "group" };
  }
  if (source.kind === "room") {
    return { id: source.roomId, type: "room" };
  }
  return null;
}

async function upsertSource(
  ctx: MutationCtx,
  source: ChatSource
): Promise<Doc<"sources"> | null> {
  const key = sourceKey(source);
  if (!key) {
    return null;
  }
  const existing = await ctx.db
    .query("sources")
    .withIndex("by_lineSourceId", (q) => q.eq("lineSourceId", key.id))
    .unique();
  if (existing) {
    if (!existing.active) {
      await ctx.db.patch(existing._id, { active: true });
    }
    return existing;
  }
  const id = await ctx.db.insert("sources", {
    active: true,
    lineSourceId: key.id,
    piggybackEnabled: true,
    sourceType: key.type,
  });
  const created = await ctx.db.get(id);
  if (created && key.type === "group") {
    await ctx.scheduler.runAfter(0, internal.line.send.resolveSourceName, {
      sourceId: created._id,
    });
  }
  return created;
}

async function onJoin(
  ctx: MutationCtx,
  source: ChatSource,
  replyToken: string | undefined
): Promise<void> {
  const created = await upsertSource(ctx, source);
  if (created) {
    await reply(ctx, replyToken, [joinMessage()]);
  }
}

async function onLeave(ctx: MutationCtx, source: ChatSource): Promise<void> {
  const key = sourceKey(source);
  if (!key) {
    return;
  }
  const existing = await ctx.db
    .query("sources")
    .withIndex("by_lineSourceId", (q) => q.eq("lineSourceId", key.id))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { active: false });
  }
}

// ---- Messages ----

async function onMessage(
  ctx: MutationCtx,
  event: Extract<LineEvent, { type: "message" }>
): Promise<void> {
  const { message, replyToken, source } = event;

  if (source.kind === "user") {
    const member = await ensureMember(ctx, source.userId);
    if (member.isNew) {
      // First contact without a stored follow event: greet instead of parsing.
      await reply(ctx, replyToken, [welcomeMessage(liffUrl())]);
      return;
    }
    if (message.type === "text") {
      await respondToCommand(
        ctx,
        parseCommand(message.text),
        replyToken,
        false
      );
      return;
    }
    // A photo dropped into the 1:1 chat: point at the app, where the AI runs.
    await reply(ctx, replyToken, [photoHintMessage(liffUrl())]);
    return;
  }

  const sourceDoc = await upsertSource(ctx, source);
  if (!sourceDoc) {
    return;
  }
  if (message.type === "text" && mentionsBot(message.mentionees)) {
    const text = stripBotMentions(message.text, message.mentionees);
    await respondToCommand(ctx, parseCommand(text), replyToken, true);
    return;
  }
  await maybePiggyback(ctx, sourceDoc, replyToken);
}

function toRow(view: ItemView): ItemRow {
  return {
    daysLeft: view.daysLeft,
    expiresOn: view.expiresOn,
    id: view.id,
    name: view.name,
    urgency: view.urgency,
  };
}

const LIST_TITLES = {
  all: "ของในบ้าน",
  expired: "หมดอายุแล้ว",
  soon: "ใกล้หมดอายุ",
} as const;

async function respondToCommand(
  ctx: MutationCtx,
  command: Command,
  replyToken: string | undefined,
  inGroup: boolean
): Promise<void> {
  const settings = await getSettings(ctx);
  const today = todayInHousehold();
  switch (command.kind) {
    case "list": {
      const all = await listActiveItems(ctx, today, settings.reminderDays);
      const rows = applyFilter(all, command.filter);
      await reply(ctx, replyToken, [
        listMessage({
          liffUrl: liffUrl(),
          rows: rows.map(toRow),
          title: LIST_TITLES[command.filter],
          totalCount: rows.length,
        }),
      ]);
      return;
    }
    case "history": {
      const rows = await listArchivedItems(ctx, today, settings.reminderDays);
      await reply(ctx, replyToken, [
        historyMessage(
          rows.map((r) => ({
            label: r.status === "used" ? "ใช้แล้ว" : "ลบแล้ว",
            name: r.name,
          })),
          liffUrl()
        ),
      ]);
      return;
    }
    case "help":
    case "unknown": {
      await reply(ctx, replyToken, [helpMessage(liffUrl(), inGroup)]);
      return;
    }
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}

/**
 * Piggyback reminder: the bot may reply to any group message, so when something
 * is about to expire it says so once a day, on the back of whatever was said.
 */
async function maybePiggyback(
  ctx: MutationCtx,
  source: Doc<"sources">,
  replyToken: string | undefined
): Promise<void> {
  if (!(source.piggybackEnabled && replyToken)) {
    return;
  }
  const today = todayInHousehold();
  if (source.lastPiggybackOn === today) {
    return;
  }
  const settings = await getSettings(ctx);
  const horizon = addDays(today, settings.piggybackDays);
  const active = await listActiveItems(ctx, today, settings.piggybackDays);
  const rows = active.filter(
    (r) => r.expiresOn !== null && r.expiresOn <= horizon
  );
  if (rows.length === 0) {
    return;
  }
  await ctx.db.patch(source._id, { lastPiggybackOn: today });
  await ctx.db.insert("notifications", {
    detail: `${source.displayName ?? source.lineSourceId}: ${rows
      .slice(0, 5)
      .map((r) => r.name)
      .join(", ")}`,
    itemCount: rows.length,
    kind: "piggyback",
    sentAt: Date.now(),
  });
  await reply(ctx, replyToken, [piggybackMessage(rows.map(toRow), liffUrl())]);
}

// ---- Postbacks (buttons in the Flex list) ----

async function onPostback(
  ctx: MutationCtx,
  data: string,
  replyToken: string | undefined
): Promise<void> {
  const action = parsePostbackData(data);
  if (action.kind === "unknown") {
    return;
  }
  if (action.kind === "cancel") {
    await reply(ctx, replyToken, [textMessage("ยกเลิกแล้ว")]);
    return;
  }
  const itemId = ctx.db.normalizeId("items", action.itemId);
  const item = itemId ? await ctx.db.get(itemId) : null;
  if (!item) {
    await reply(ctx, replyToken, [textMessage("ไม่พบรายการนี้แล้ว")]);
    return;
  }
  switch (action.kind) {
    case "used": {
      if (item.status === "active") {
        await archiveItem(ctx, item, "used");
      }
      await reply(ctx, replyToken, [textMessage(`✅ ใช้แล้ว: ${item.name}`)]);
      return;
    }
    case "delete": {
      await reply(ctx, replyToken, [confirmDeleteMessage(item._id, item.name)]);
      return;
    }
    case "deleteConfirmed": {
      if (item.status === "active") {
        await archiveItem(ctx, item, "deleted");
      }
      await reply(ctx, replyToken, [textMessage(`🗑️ ลบแล้ว: ${item.name}`)]);
      return;
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
