"use node";
// Reads product name and expiry date off the uploaded photos with Gemini
// Flash-Lite on the AI Studio free tier. One provider, one retry, then the form
// falls back to manual entry.

import { setTimeout as sleep } from "node:timers/promises";

import { GoogleGenAI, Type } from "@google/genai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { IsoDate } from "./lib/dates";
import { parseIsoDate, todayInHousehold } from "./lib/dates";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_IMAGES = 4;
const RETRY_AFTER_MS = 3000;

export interface Guess {
  basis: "printed" | "estimated" | "none";
  confidence: "high" | "medium" | "low";
  expiresOn?: IsoDate;
  model: string;
  name?: string;
  note?: string;
}

export type GuessResult =
  | { kind: "ok"; guess: Guess }
  | { kind: "unavailable"; reason: string };

function buildPrompt(today: IsoDate): string {
  return [
    "You are reading photos of a grocery or household product for a Thai family's pantry list.",
    `Today is ${today} (Asia/Bangkok).`,
    "Return JSON only.",
    "- name: short product name in Thai (brand and type, at most 40 characters).",
    "- expiresOn: the printed expiry or best-before date as YYYY-MM-DD when one is legible.",
    "  Thai packaging labels it EXP, EXD, BBE, BB, หมดอายุ, or ควรบริโภคก่อน.",
    "  MFG, MFD, or ผลิต is the manufacture date, not the expiry. Do not use it as the expiry.",
    "  Years may be Buddhist era: 2569 means 2026, and a two-digit 69 means 2569.",
    "  Day comes before month on Thai packs (15/10/69 is 15 October 2026).",
    "- basis: 'printed' when you read the date off the label; 'estimated' when no date is legible",
    "  but the product type is clear and you estimated a typical shelf life from today;",
    "  'none' when you can do neither (then expiresOn is null).",
    "- confidence: 'high' only when the printed date is clearly legible; 'medium' for a partly",
    "  legible date or a confident estimate; 'low' otherwise.",
    "- note: one short Thai sentence saying what you read, for example 'อ่านจากฉลาก EXP 15/10/69'",
    "  or 'ไม่เห็นวันหมดอายุ ประเมินจากประเภทสินค้า'.",
  ].join("\n");
}

const RESPONSE_SCHEMA = {
  properties: {
    basis: { enum: ["printed", "estimated", "none"], type: Type.STRING },
    confidence: { enum: ["high", "medium", "low"], type: Type.STRING },
    expiresOn: { nullable: true, type: Type.STRING },
    name: { type: Type.STRING },
    note: { type: Type.STRING },
  },
  required: ["basis", "confidence", "expiresOn", "name", "note"],
  type: Type.OBJECT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGuess(text: string | undefined, model: string): Guess | null {
  if (!text) {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data)) {
    return null;
  }
  const { basis, confidence } = data;
  if (basis !== "printed" && basis !== "estimated" && basis !== "none") {
    return null;
  }
  if (
    confidence !== "high" &&
    confidence !== "medium" &&
    confidence !== "low"
  ) {
    return null;
  }
  const expiresOn =
    typeof data.expiresOn === "string"
      ? (parseIsoDate(data.expiresOn) ?? undefined)
      : undefined;
  const name =
    typeof data.name === "string" && data.name.trim() !== ""
      ? data.name.trim()
      : undefined;
  const note =
    typeof data.note === "string" && data.note.trim() !== ""
      ? data.note.trim()
      : undefined;
  return {
    basis: expiresOn === undefined && basis !== "none" ? "none" : basis,
    confidence,
    expiresOn,
    model,
    name,
    note,
  };
}

function isRateLimited(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }
  if (error.status === 429 || error.code === 429) {
    return true;
  }
  const message = typeof error.message === "string" ? error.message : "";
  return message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
}

function describeError(error: unknown): string {
  if (isRecord(error) && typeof error.message === "string") {
    return error.message.slice(0, 300);
  }
  return String(error).slice(0, 300);
}

export const guess = action({
  args: { storageIds: v.array(v.id("_storage")), token: v.string() },
  handler: async (ctx, { storageIds, token }): Promise<GuessResult> => {
    const member = await ctx.runQuery(internal.auth.memberByToken, { token });
    if (!member) {
      throw new Error("กรุณาเข้าสู่ระบบใหม่");
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { kind: "unavailable", reason: "GEMINI_API_KEY not configured" };
    }
    const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

    const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];
    for (const storageId of storageIds.slice(0, MAX_IMAGES)) {
      const blob = await ctx.storage.get(storageId);
      if (!blob) {
        continue;
      }
      const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
      imageParts.push({
        inlineData: { data, mimeType: blob.type || "image/jpeg" },
      });
    }
    if (imageParts.length === 0) {
      return { kind: "unavailable", reason: "no photos" };
    }

    const ai = new GoogleGenAI({ apiKey });
    const request = () =>
      ai.models.generateContent({
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
        contents: [
          {
            parts: [...imageParts, { text: buildPrompt(todayInHousehold()) }],
            role: "user",
          },
        ],
        model,
      });

    let text: string | undefined;
    try {
      ({ text } = await request());
    } catch (error) {
      if (!isRateLimited(error)) {
        console.error("gemini request failed", describeError(error));
        return { kind: "unavailable", reason: describeError(error) };
      }
      await sleep(RETRY_AFTER_MS);
      try {
        ({ text } = await request());
      } catch (retryError) {
        console.error("gemini retry failed", describeError(retryError));
        return { kind: "unavailable", reason: describeError(retryError) };
      }
    }

    const parsed = parseGuess(text, model);
    if (!parsed) {
      console.error("gemini response unparseable", text?.slice(0, 200));
      return { kind: "unavailable", reason: "unparseable response" };
    }
    return { guess: parsed, kind: "ok" };
  },
});
