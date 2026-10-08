import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Data model: see docs/SRS.md §4. One household pantry; membership is "follows
// the LINE OA". Expiry dates are `YYYY-MM-DD` strings in Asia/Bangkok.

export const itemStatus = v.union(
  v.literal("active"),
  v.literal("used"),
  v.literal("deleted")
);

export const guessBasis = v.union(
  v.literal("printed"),
  v.literal("estimated"),
  v.literal("none")
);

export const guessConfidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

/** What the model read off the photos, kept for the record next to what was saved. */
export const guessValidator = v.object({
  basis: guessBasis,
  confidence: guessConfidence,
  expiresOn: v.optional(v.string()),
  model: v.string(),
  name: v.optional(v.string()),
  note: v.optional(v.string()),
});

export default defineSchema({
  // Singleton household config. Created lazily on first use.
  settings: defineTable({
    piggybackDays: v.number(), // default 2: group warning when ≤ N days left
    reminderDays: v.number(), // default 3: Web Push digest horizon
  }),

  // A LINE user who follows the OA. Following is what grants pantry access.
  members: defineTable({
    displayName: v.optional(v.string()),
    followedAt: v.number(),
    lineUserId: v.string(),
    pictureUrl: v.optional(v.string()),
    status: v.union(v.literal("following"), v.literal("left")),
  }).index("by_lineUserId", ["lineUserId"]),

  // Web sessions minted after a LINE Login ID token is verified.
  sessions: defineTable({
    expiresAt: v.number(),
    memberId: v.id("members"),
    token: v.string(), // 256-bit random, held by the browser
    userAgent: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_memberId", ["memberId"]),

  // Group / multi-person chats the OA sits in. Piggyback reminders live here.
  sources: defineTable({
    active: v.boolean(), // false after a `leave` event
    displayName: v.optional(v.string()),
    lastPiggybackOn: v.optional(v.string()), // YYYY-MM-DD of the last warning
    lineSourceId: v.string(),
    piggybackEnabled: v.boolean(),
    sourceType: v.union(v.literal("group"), v.literal("room")),
  }).index("by_lineSourceId", ["lineSourceId"]),

  // The pantry.
  items: defineTable({
    addedBy: v.id("members"),
    archivedAt: v.optional(v.number()), // set when status leaves "active"
    expiresOn: v.optional(v.string()), // YYYY-MM-DD; absent = not known yet
    guess: v.optional(guessValidator),
    name: v.string(),
    note: v.optional(v.string()),
    status: itemStatus,
  })
    .index("by_status_and_expiresOn", ["status", "expiresOn"])
    .index("by_status_and_archivedAt", ["status", "archivedAt"]),

  // Photos of an item (front of pack, date close-up). Bytes live in file storage.
  photos: defineTable({
    itemId: v.id("items"),
    position: v.number(),
    storageId: v.id("_storage"),
  }).index("by_itemId", ["itemId"]),

  // Web Push subscriptions, one per browser/device, owned by a member.
  pushSubscriptions: defineTable({
    endpoint: v.string(),
    keys: v.object({ auth: v.string(), p256dh: v.string() }),
    memberId: v.id("members"),
    userAgent: v.optional(v.string()),
  })
    .index("by_endpoint", ["endpoint"])
    .index("by_memberId", ["memberId"]),

  // Webhook idempotency: LINE may redeliver, so every event id is recorded.
  webhookEvents: defineTable({
    receivedAt: v.number(),
    webhookEventId: v.string(),
  })
    .index("by_webhookEventId", ["webhookEventId"])
    .index("by_receivedAt", ["receivedAt"]),

  // Audit of reminders that went out, by channel.
  notifications: defineTable({
    detail: v.string(),
    error: v.optional(v.string()),
    itemCount: v.number(),
    kind: v.union(v.literal("push"), v.literal("piggyback")),
    sentAt: v.number(),
  }).index("by_sentAt", ["sentAt"]),
});
