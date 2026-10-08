// Bot command parsing. Pure; no Convex imports.
//
// In a group the bot only reacts when it is @-mentioned itself (`isSelf`), never
// on `@all`. The mention span is cut out of the text and the rest is matched
// against a small Thai/English vocabulary.

export interface Mentionee {
  index: number;
  length: number;
  type: "user" | "all";
  isSelf?: boolean;
}

export type ListFilter = "all" | "soon" | "expired";

export type Command =
  | { kind: "list"; filter: ListFilter }
  | { kind: "history" }
  | { kind: "help" }
  | { kind: "unknown"; text: string };

const LIST_ALL = new Set(["", "รายการ", "ทั้งหมด", "list", "all", "ดู"]);
const LIST_SOON = new Set(["ใกล้หมด", "ใกล้หมดอายุ", "soon", "ใกล้"]);
const LIST_EXPIRED = new Set(["หมดแล้ว", "หมดอายุ", "หมดอายุแล้ว", "expired"]);
const HISTORY = new Set(["ประวัติ", "history", "ใช้แล้ว"]);
const HELP = new Set(["ช่วย", "ช่วยเหลือ", "help", "วิธีใช้", "?"]);

/** True when any mentionee is the bot itself. `@all` never counts. */
export function mentionsBot(mentionees: Mentionee[] | undefined): boolean {
  return (mentionees ?? []).some((m) => m.type === "user" && m.isSelf === true);
}

/** Remove the bot's own mention spans from the text. */
export function stripBotMentions(
  text: string,
  mentionees: Mentionee[] | undefined
): string {
  const spans = (mentionees ?? [])
    .filter((m) => m.type === "user" && m.isSelf === true)
    .toSorted((a, b) => b.index - a.index);
  let out = text;
  for (const span of spans) {
    out = out.slice(0, span.index) + out.slice(span.index + span.length);
  }
  return out;
}

export function parseCommand(rawText: string): Command {
  const text = rawText.trim().replaceAll(/\s+/gu, " ").toLowerCase();
  if (LIST_ALL.has(text)) {
    return { filter: "all", kind: "list" };
  }
  if (LIST_SOON.has(text)) {
    return { filter: "soon", kind: "list" };
  }
  if (LIST_EXPIRED.has(text)) {
    return { filter: "expired", kind: "list" };
  }
  if (HISTORY.has(text)) {
    return { kind: "history" };
  }
  if (HELP.has(text)) {
    return { kind: "help" };
  }
  return { kind: "unknown", text };
}
