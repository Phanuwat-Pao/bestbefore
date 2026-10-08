// LINE Messaging API helpers: webhook signature check, reply, and read-only
// lookups. Replies use a reply token and never touch the monthly push quota.

import type { LineMessage } from "./flex";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_LOGIN_API = "https://api.line.me/oauth2/v2.1";

/** Verify the X-Line-Signature header: base64(HMAC-SHA256(rawBody, channelSecret)). */
export async function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );
  const expected = btoa(String.fromCodePoint(...new Uint8Array(mac)));
  if (expected.length !== signature.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= (expected.codePointAt(i) ?? 0) ^ (signature.codePointAt(i) ?? 0);
  }
  return diff === 0;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export type ReplyResult =
  | { kind: "sent" }
  | { kind: "failed"; status: number; body: string };

/** Reply to a webhook event. Max 5 messages; the token is single-use and short-lived. */
export async function replyMessage(
  replyToken: string,
  messages: LineMessage[],
  token: string
): Promise<ReplyResult> {
  const res = await fetch(`${LINE_API}/message/reply`, {
    body: JSON.stringify({ messages: messages.slice(0, 5), replyToken }),
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    method: "POST",
  });
  if (res.ok) {
    return { kind: "sent" };
  }
  return { body: await res.text(), kind: "failed", status: res.status };
}

export interface LineProfile {
  displayName: string;
  pictureUrl?: string;
}

/** Profile of a user who follows the OA. Null on any failure. */
export async function getProfile(
  userId: string,
  token: string
): Promise<LineProfile | null> {
  try {
    const res = await fetch(`${LINE_API}/profile/${userId}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      return null;
    }
    const data: unknown = await res.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("displayName" in data) ||
      typeof data.displayName !== "string"
    ) {
      return null;
    }
    const pictureUrl =
      "pictureUrl" in data && typeof data.pictureUrl === "string"
        ? data.pictureUrl
        : undefined;
    return { displayName: data.displayName, pictureUrl };
  } catch {
    return null;
  }
}

/** Best-effort group display name. Rooms have no name endpoint. */
export async function getGroupName(
  groupId: string,
  token: string
): Promise<string | null> {
  try {
    const res = await fetch(`${LINE_API}/group/${groupId}/summary`, {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      return null;
    }
    const data: unknown = await res.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "groupName" in data &&
      typeof data.groupName === "string"
    ) {
      return data.groupName;
    }
    return null;
  } catch {
    return null;
  }
}

export interface VerifiedIdToken {
  sub: string;
  name?: string;
  picture?: string;
}

export type VerifyIdTokenResult =
  | { kind: "ok"; claims: VerifiedIdToken }
  | { kind: "invalid"; reason: string };

/** Verify a LINE Login ID token server-side (LIFF `liff.getIDToken()`). */
export async function verifyIdToken(
  idToken: string,
  channelId: string
): Promise<VerifyIdTokenResult> {
  const body = new URLSearchParams({ client_id: channelId, id_token: idToken });
  let res: Response;
  try {
    res = await fetch(`${LINE_LOGIN_API}/verify`, {
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
  } catch (error) {
    return { kind: "invalid", reason: String(error) };
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || typeof data !== "object" || data === null) {
    const reason =
      typeof data === "object" &&
      data !== null &&
      "error_description" in data &&
      typeof data.error_description === "string"
        ? data.error_description
        : `LINE returned ${res.status}`;
    return { kind: "invalid", reason };
  }
  if (!("sub" in data) || typeof data.sub !== "string") {
    return { kind: "invalid", reason: "missing sub" };
  }
  return {
    claims: {
      name:
        "name" in data && typeof data.name === "string" ? data.name : undefined,
      picture:
        "picture" in data && typeof data.picture === "string"
          ? data.picture
          : undefined,
      sub: data.sub,
    },
    kind: "ok",
  };
}
