// LINE message builders (text, quick reply, Flex). Pure; typed to the subset of the
// Flex spec this bot uses so a typo fails at compile time, not at LINE's 400.

import type { IsoDate, Urgency } from "./dates";
import { describeDaysLeft, formatThai } from "./dates";

export type LineAction =
  | { type: "postback"; label: string; data: string; displayText?: string }
  | { type: "uri"; label: string; uri: string };

type Spacing = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export interface FlexText {
  type: "text";
  text: string;
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
  color?: string;
  weight?: "regular" | "bold";
  wrap?: boolean;
  flex?: number;
  align?: "start" | "end" | "center";
  margin?: Spacing;
}

export interface FlexButton {
  type: "button";
  action: LineAction;
  style?: "primary" | "secondary" | "link";
  height?: "sm" | "md";
  color?: string;
  flex?: number;
  margin?: Spacing;
}

export interface FlexSeparator {
  type: "separator";
  margin?: Spacing;
}

export interface FlexBox {
  type: "box";
  layout: "vertical" | "horizontal" | "baseline";
  contents: FlexComponent[];
  spacing?: Spacing;
  margin?: Spacing;
  paddingAll?: string;
}

export type FlexComponent = FlexText | FlexButton | FlexSeparator | FlexBox;

export interface FlexBubble {
  type: "bubble";
  size?: "kilo" | "mega" | "giga";
  header?: FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
}

export interface QuickReply {
  items: { type: "action"; action: LineAction }[];
}

export type LineMessage =
  | { type: "text"; text: string; quickReply?: QuickReply }
  | {
      type: "flex";
      altText: string;
      contents: FlexBubble;
      quickReply?: QuickReply;
    };

/** One pantry row as the bot shows it. */
export interface ItemRow {
  id: string;
  name: string;
  expiresOn: IsoDate | null;
  daysLeft: number | null;
  urgency: Urgency;
}

const COLOR: Record<Urgency, string> = {
  expired: "#DC2626",
  ok: "#16A34A",
  soon: "#D97706",
  today: "#EA580C",
  unknown: "#6B7280",
};

const MUTED = "#6B7280";
const MAX_ROWS = 10;

export function textMessage(
  text: string,
  quickReply?: QuickReply
): LineMessage {
  return quickReply
    ? { quickReply, text, type: "text" }
    : { text, type: "text" };
}

function uriButton(
  label: string,
  uri: string,
  style?: FlexButton["style"]
): FlexButton {
  return {
    action: { label, type: "uri", uri },
    height: "sm",
    style: style ?? "link",
    type: "button",
  };
}

function postbackButton(
  label: string,
  data: string,
  displayText: string,
  color?: string
): FlexButton {
  return {
    action: { data, displayText, label, type: "postback" },
    color,
    height: "sm",
    style: "link",
    type: "button",
  };
}

function safeText(text: string): string {
  // Flex rejects empty text; the pantry form never saves an empty name, but be safe.
  return text.trim() === "" ? "ไม่ระบุชื่อ" : text;
}

function itemBlock(row: ItemRow, liffUrl: string): FlexBox {
  const dateLine =
    row.expiresOn === null
      ? "ยังไม่ระบุวันหมดอายุ"
      : `หมดอายุ ${formatThai(row.expiresOn)}`;
  return {
    contents: [
      {
        contents: [
          {
            flex: 3,
            size: "md",
            text: safeText(row.name),
            type: "text",
            weight: "bold",
            wrap: true,
          },
          {
            align: "end",
            color: COLOR[row.urgency],
            flex: 2,
            size: "sm",
            text: describeDaysLeft(row.daysLeft),
            type: "text",
            weight: "bold",
          },
        ],
        layout: "horizontal",
        type: "box",
      },
      { color: MUTED, size: "xs", text: dateLine, type: "text" },
      {
        contents: [
          postbackButton(
            "ใช้แล้ว",
            `a=used&i=${row.id}`,
            `ใช้แล้ว: ${row.name}`,
            "#16A34A"
          ),
          uriButton("แก้ไข", `${liffUrl}/items/${row.id}`),
          postbackButton(
            "ลบ",
            `a=del&i=${row.id}`,
            `ลบ: ${row.name}`,
            "#DC2626"
          ),
        ],
        layout: "horizontal",
        spacing: "sm",
        type: "box",
      },
    ],
    layout: "vertical",
    spacing: "xs",
    type: "box",
  };
}

function footer(liffUrl: string): FlexBox {
  return {
    contents: [
      uriButton("เพิ่มของ", `${liffUrl}/add`, "primary"),
      uriButton("เปิดแอป", liffUrl, "secondary"),
    ],
    layout: "horizontal",
    spacing: "sm",
    type: "box",
  };
}

export function listMessage(args: {
  title: string;
  rows: ItemRow[];
  totalCount: number;
  liffUrl: string;
}): LineMessage {
  const shown = args.rows.slice(0, MAX_ROWS);
  const body: FlexComponent[] = [];
  if (shown.length === 0) {
    body.push({
      color: MUTED,
      size: "sm",
      text: "ไม่มีรายการ",
      type: "text",
      wrap: true,
    });
  }
  for (const [i, row] of shown.entries()) {
    if (i > 0) {
      body.push({ margin: "md", type: "separator" });
    }
    body.push(itemBlock(row, args.liffUrl));
  }
  if (args.totalCount > shown.length) {
    body.push({
      color: MUTED,
      margin: "md",
      size: "xs",
      text: `และอีก ${args.totalCount - shown.length} รายการ ดูทั้งหมดได้ในแอป`,
      type: "text",
      wrap: true,
    });
  }
  const altText =
    shown.length === 0
      ? `${args.title}: ไม่มีรายการ`
      : `${args.title}: ${shown
          .slice(0, 3)
          .map((r) => `${r.name} (${describeDaysLeft(r.daysLeft)})`)
          .join(", ")}`;
  return {
    altText: altText.slice(0, 400),
    contents: {
      body: { contents: body, layout: "vertical", spacing: "md", type: "box" },
      footer: footer(args.liffUrl),
      header: {
        contents: [
          { size: "lg", text: args.title, type: "text", weight: "bold" },
          {
            color: MUTED,
            size: "xs",
            text: `${args.totalCount} รายการ`,
            type: "text",
          },
        ],
        layout: "vertical",
        type: "box",
      },
      size: "mega",
      type: "bubble",
    },
    type: "flex",
  };
}

export interface HistoryRow {
  name: string;
  label: string;
}

export function historyMessage(
  rows: HistoryRow[],
  liffUrl: string
): LineMessage {
  const shown = rows.slice(0, MAX_ROWS);
  const body: FlexComponent[] =
    shown.length === 0
      ? [{ color: MUTED, size: "sm", text: "ยังไม่มีประวัติ", type: "text" }]
      : shown.map((row) => ({
          contents: [
            {
              flex: 3,
              size: "sm",
              text: safeText(row.name),
              type: "text",
              wrap: true,
            },
            {
              align: "end",
              color: MUTED,
              flex: 2,
              size: "xs",
              text: row.label,
              type: "text",
            },
          ],
          layout: "horizontal",
          type: "box",
        }));
  return {
    altText: `ประวัติ: ${shown.map((r) => r.name).join(", ") || "ว่าง"}`.slice(
      0,
      400
    ),
    contents: {
      body: { contents: body, layout: "vertical", spacing: "sm", type: "box" },
      footer: {
        contents: [uriButton("ดูประวัติในแอป", `${liffUrl}/history`, "secondary")],
        layout: "horizontal",
        type: "box",
      },
      header: {
        contents: [
          { size: "lg", text: "ประวัติที่ใช้แล้ว", type: "text", weight: "bold" },
        ],
        layout: "vertical",
        type: "box",
      },
      size: "mega",
      type: "bubble",
    },
    type: "flex",
  };
}

export function helpMessage(liffUrl: string, inGroup: boolean): LineMessage {
  const prefix = inGroup ? "แท็กบอทแล้วพิมพ์" : "พิมพ์";
  const text = [
    "BestBefore ช่วยจำวันหมดอายุของของในบ้าน",
    "",
    `${prefix}คำสั่งเหล่านี้ได้`,
    "• รายการ หรือเว้นว่าง: ดูของทั้งหมด เรียงใกล้หมดอายุก่อน",
    "• ใกล้หมด: ของที่ใกล้หมดอายุ",
    "• หมดแล้ว: ของที่หมดอายุแล้ว",
    "• ประวัติ: ของที่ใช้แล้ว",
    "• ช่วย: ข้อความนี้",
    "",
    "เพิ่มของใหม่ด้วยการถ่ายรูปในแอป",
  ].join("\n");
  return textMessage(text, {
    items: [
      {
        action: { label: "เพิ่มของ", type: "uri", uri: `${liffUrl}/add` },
        type: "action",
      },
      {
        action: { label: "เปิดแอป", type: "uri", uri: liffUrl },
        type: "action",
      },
    ],
  });
}

export function welcomeMessage(liffUrl: string): LineMessage {
  return textMessage(
    [
      "ยินดีต้อนรับสู่ BestBefore",
      "ถ่ายรูปของที่ซื้อมา บอทจะอ่านวันหมดอายุให้ แล้วเตือนก่อนหมด",
      "",
      "กด เพิ่มของ เพื่อเริ่ม หรือพิมพ์ ช่วย เพื่อดูคำสั่ง",
    ].join("\n"),
    {
      items: [
        {
          action: { label: "เพิ่มของ", type: "uri", uri: `${liffUrl}/add` },
          type: "action",
        },
        {
          action: { label: "เปิดแอป", type: "uri", uri: liffUrl },
          type: "action",
        },
      ],
    }
  );
}

export function joinMessage(): LineMessage {
  return textMessage(
    [
      "สวัสดี BestBefore มาช่วยจำวันหมดอายุของในบ้านแล้ว",
      "แท็กบอทในกลุ่มนี้เพื่อดูรายการ เช่น @BestBefore ใกล้หมด",
      "เพิ่มของได้จากแชทส่วนตัวกับบอท",
    ].join("\n")
  );
}

export function photoHintMessage(liffUrl: string): LineMessage {
  return textMessage("เพิ่มของด้วยรูปได้ในแอป กดปุ่มด้านล่างเพื่อถ่ายรูป", {
    items: [
      {
        action: { label: "เพิ่มของ", type: "uri", uri: `${liffUrl}/add` },
        type: "action",
      },
    ],
  });
}

export function confirmDeleteMessage(
  itemId: string,
  name: string
): LineMessage {
  return textMessage(`ลบ "${name}" ออกจากรายการ?`, {
    items: [
      {
        action: {
          data: `a=delok&i=${itemId}`,
          displayText: `ยืนยันลบ: ${name}`,
          label: "ยืนยันลบ",
          type: "postback",
        },
        type: "action",
      },
      {
        action: {
          data: "a=cancel",
          displayText: "ยกเลิก",
          label: "ยกเลิก",
          type: "postback",
        },
        type: "action",
      },
    ],
  });
}

/** The opportunistic group warning: rides on the reply token of any message. */
export function piggybackMessage(
  rows: ItemRow[],
  liffUrl: string
): LineMessage {
  const lines = rows
    .slice(0, 8)
    .map((r) => `• ${r.name}: ${describeDaysLeft(r.daysLeft)}`);
  if (rows.length > 8) {
    lines.push(`• และอีก ${rows.length - 8} รายการ`);
  }
  return textMessage(["⚠️ ของใกล้หมดอายุ", ...lines].join("\n"), {
    items: [
      {
        action: { label: "ดูรายการ", type: "uri", uri: liffUrl },
        type: "action",
      },
    ],
  });
}
