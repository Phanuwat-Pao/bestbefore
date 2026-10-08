// LINE webhook event parsing. Raw webhook JSON is `unknown` at the boundary and is
// narrowed into the small set of event shapes this bot acts on. Pure.

import type { Mentionee } from "./commands";

export type ChatSource =
  | { kind: "user"; userId: string }
  | { kind: "group"; groupId: string; userId?: string }
  | { kind: "room"; roomId: string; userId?: string };

interface EventBase {
  webhookEventId: string;
  timestamp: number;
  isRedelivery: boolean;
  replyToken?: string;
  source: ChatSource;
}

export type IncomingMessage =
  | { type: "text"; id: string; text: string; mentionees?: Mentionee[] }
  | { type: "image"; id: string }
  | { type: "other"; id?: string; messageType: string };

export type LineEvent =
  | (EventBase & { type: "follow" })
  | (EventBase & { type: "unfollow" })
  | (EventBase & { type: "join" })
  | (EventBase & { type: "leave" })
  | (EventBase & { type: "message"; message: IncomingMessage })
  | (EventBase & { type: "postback"; data: string; params?: PostbackParams })
  | (EventBase & { type: "ignored"; eventType: string });

export interface PostbackParams {
  date?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function num(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function parseSource(raw: unknown): ChatSource | null {
  if (!isRecord(raw)) {
    return null;
  }
  const type = str(raw, "type");
  const userId = str(raw, "userId");
  if (type === "user" && userId) {
    return { kind: "user", userId };
  }
  const groupId = str(raw, "groupId");
  if (type === "group" && groupId) {
    return { groupId, kind: "group", userId };
  }
  const roomId = str(raw, "roomId");
  if (type === "room" && roomId) {
    return { kind: "room", roomId, userId };
  }
  return null;
}

function parseMentionees(raw: unknown): Mentionee[] | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.mentionees)) {
    return undefined;
  }
  const out: Mentionee[] = [];
  for (const entry of raw.mentionees) {
    if (!isRecord(entry)) {
      continue;
    }
    const index = num(entry, "index");
    const length = num(entry, "length");
    const type = str(entry, "type");
    if (index === undefined || length === undefined) {
      continue;
    }
    if (type !== "user" && type !== "all") {
      continue;
    }
    out.push({
      index,
      isSelf: entry.isSelf === true,
      length,
      type,
    });
  }
  return out;
}

function parseMessage(raw: unknown): IncomingMessage | null {
  if (!isRecord(raw)) {
    return null;
  }
  const type = str(raw, "type");
  const id = str(raw, "id");
  const text = str(raw, "text");
  if (type === "text" && id && text !== undefined) {
    return { id, mentionees: parseMentionees(raw.mention), text, type: "text" };
  }
  if (type === "image" && id) {
    return { id, type: "image" };
  }
  return { id, messageType: type ?? "unknown", type: "other" };
}

function parsePostbackParams(raw: unknown): PostbackParams | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  return { date: str(raw, "date") };
}

/** Narrow one raw webhook event. Returns null when it has no usable source. */
export function parseLineEvent(raw: unknown): LineEvent | null {
  if (!isRecord(raw)) {
    return null;
  }
  const source = parseSource(raw.source);
  if (!source) {
    return null;
  }
  const type = str(raw, "type") ?? "unknown";
  const timestamp = num(raw, "timestamp") ?? Date.now();
  const sourceKey =
    source.kind === "user"
      ? source.userId
      : source.kind === "group"
        ? source.groupId
        : source.roomId;
  const webhookEventId =
    str(raw, "webhookEventId") ?? `${sourceKey}:${type}:${timestamp}`;
  const delivery = isRecord(raw.deliveryContext) ? raw.deliveryContext : {};
  const base: EventBase = {
    isRedelivery: delivery.isRedelivery === true,
    replyToken: str(raw, "replyToken"),
    source,
    timestamp,
    webhookEventId,
  };

  switch (type) {
    case "follow":
    case "unfollow":
    case "join":
    case "leave": {
      return { ...base, type };
    }
    case "message": {
      const message = parseMessage(raw.message);
      return message ? { ...base, message, type } : null;
    }
    case "postback": {
      const postback = isRecord(raw.postback) ? raw.postback : null;
      const data = postback ? str(postback, "data") : undefined;
      if (data === undefined) {
        return null;
      }
      return {
        ...base,
        data,
        params: parsePostbackParams(postback?.params),
        type,
      };
    }
    default: {
      return { ...base, eventType: type, type: "ignored" };
    }
  }
}

/** Postback `data` is a query string: `a=used&i=<itemId>`. */
export type PostbackAction =
  | { kind: "used"; itemId: string }
  | { kind: "delete"; itemId: string }
  | { kind: "deleteConfirmed"; itemId: string }
  | { kind: "cancel" }
  | { kind: "unknown" };

export function parsePostbackData(data: string): PostbackAction {
  const params = new URLSearchParams(data);
  const action = params.get("a");
  const itemId = params.get("i");
  if (action === "cancel") {
    return { kind: "cancel" };
  }
  if (!itemId) {
    return { kind: "unknown" };
  }
  if (action === "used") {
    return { itemId, kind: "used" };
  }
  if (action === "del") {
    return { itemId, kind: "delete" };
  }
  if (action === "delok") {
    return { itemId, kind: "deleteConfirmed" };
  }
  return { kind: "unknown" };
}
