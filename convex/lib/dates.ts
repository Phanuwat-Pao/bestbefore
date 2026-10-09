// Calendar-date helpers shared by Convex functions and the web app. Pure.
//
// An expiry is a calendar date, not an instant: "15 Oct" on a carton means the
// same thing in every time zone. So dates travel as `YYYY-MM-DD` strings and
// "today" is computed in the household's zone. Asia/Bangkok has no DST, so a
// fixed offset is enough and avoids relying on ICU data in the Convex runtime.

export type IsoDate = string & { readonly __brand: "IsoDate" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Bangkok is UTC+7 year-round. */
const HOUSEHOLD_OFFSET_MINUTES = 7 * 60;

export function parseIsoDate(input: string): IsoDate | null {
  if (!ISO_DATE.test(input)) {
    return null;
  }
  const [y, m, d] = input.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  const roundTrips =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d;
  // Earned cast: the string matched the shape and names a real calendar day.
  return roundTrips ? (input as IsoDate) : null;
}

function toUtcMidnight(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

function fromUtcMidnight(ms: number): IsoDate {
  const date = new Date(ms);
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const parsed = parseIsoDate(`${y}-${m}-${d}`);
  if (!parsed) {
    throw new Error(`fromUtcMidnight produced an invalid date for ${ms}`);
  }
  return parsed;
}

/** Today's calendar date in the household time zone. */
export function todayInHousehold(now: Date = new Date()): IsoDate {
  const shifted = now.getTime() + HOUSEHOLD_OFFSET_MINUTES * 60 * 1000;
  return fromUtcMidnight(Math.floor(shifted / DAY_MS) * DAY_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMidnight(toUtcMidnight(date) + days * DAY_MS);
}

/** `to - from` in whole days. Negative when `to` is before `from`. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type Locale = "th" | "en";

/** `2026-10-15` → `15 ต.ค. 2569` (Buddhist era, as printed on Thai packaging). */
export function formatThai(date: IsoDate): string {
  const [y, m, d] = date.split("-").map(Number);
  const month = THAI_MONTHS[(m ?? 1) - 1] ?? "";
  return `${d} ${month} ${(y ?? 0) + 543}`;
}

/** Locale-aware date: Thai with BE year, English with the Gregorian year. */
export function formatDate(date: IsoDate, locale: Locale = "th"): string {
  if (locale === "th") {
    return formatThai(date);
  }
  const [y, m, d] = date.split("-").map(Number);
  const month = EN_MONTHS[(m ?? 1) - 1] ?? "";
  return `${d} ${month} ${y ?? 0}`;
}

export type Urgency = "expired" | "today" | "soon" | "ok" | "unknown";

/** Bucket an item by how far its expiry is from today. */
export function urgencyOf(
  daysLeft: number | null,
  soonWithinDays: number
): Urgency {
  if (daysLeft === null) {
    return "unknown";
  }
  if (daysLeft < 0) {
    return "expired";
  }
  if (daysLeft === 0) {
    return "today";
  }
  if (daysLeft <= soonWithinDays) {
    return "soon";
  }
  return "ok";
}

/** Short phrase for the list rows: "อีก 3 วัน", "พรุ่งนี้", "หมดอายุแล้ว 2 วัน". */
export function describeDaysLeft(
  daysLeft: number | null,
  locale: Locale = "th"
): string {
  if (locale === "en") {
    if (daysLeft === null) {
      return "No expiry date";
    }
    if (daysLeft < 0) {
      return `Expired ${-daysLeft} day${-daysLeft === 1 ? "" : "s"} ago`;
    }
    if (daysLeft === 0) {
      return "Expires today";
    }
    if (daysLeft === 1) {
      return "Tomorrow";
    }
    return `${daysLeft} days left`;
  }
  if (daysLeft === null) {
    return "ยังไม่ระบุวันหมดอายุ";
  }
  if (daysLeft < 0) {
    return `หมดอายุแล้ว ${-daysLeft} วัน`;
  }
  if (daysLeft === 0) {
    return "หมดอายุวันนี้";
  }
  if (daysLeft === 1) {
    return "พรุ่งนี้";
  }
  return `อีก ${daysLeft} วัน`;
}

/**
 * Parse a date a person typed: `15/10/2569`, `15-10-69`, `15.10.26`, `2026-10-15`.
 * Two-digit years ≥ 43 are read as Buddhist era short form (69 → 2569 → 2026),
 * below that as Christian era (26 → 2026). Four-digit years ≥ 2400 are BE.
 */
export function parseTypedDate(input: string): IsoDate | null {
  const trimmed = input.trim();
  const iso = parseIsoDate(trimmed);
  if (iso) {
    return iso;
  }
  const match =
    /^(?<day>\d{1,2})[/.-](?<month>\d{1,2})[/.-](?<year>\d{2}|\d{4})$/u.exec(
      trimmed
    );
  if (!match?.groups) {
    return null;
  }
  const day = Number(match.groups.day);
  const month = Number(match.groups.month);
  let year = Number(match.groups.year);
  if (year < 100) {
    year = year >= 43 ? year + 2500 - 543 : year + 2000;
  } else if (year >= 2400) {
    year -= 543;
  }
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return parseIsoDate(`${y}-${m}-${d}`);
}
