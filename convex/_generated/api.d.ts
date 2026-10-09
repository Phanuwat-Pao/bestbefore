/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as dev from "../dev.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_commands from "../lib/commands.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_flex from "../lib/flex.js";
import type * as lib_items from "../lib/items.js";
import type * as lib_line from "../lib/line.js";
import type * as lib_settings from "../lib/settings.js";
import type * as line_ingest from "../line/ingest.js";
import type * as line_send from "../line/send.js";
import type * as members from "../members.js";
import type * as push_digest from "../push/digest.js";
import type * as push_subscriptions from "../push/subscriptions.js";
import type * as settings from "../settings.js";
import type * as sources from "../sources.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  crons: typeof crons;
  dev: typeof dev;
  http: typeof http;
  items: typeof items;
  "lib/auth": typeof lib_auth;
  "lib/commands": typeof lib_commands;
  "lib/dates": typeof lib_dates;
  "lib/events": typeof lib_events;
  "lib/flex": typeof lib_flex;
  "lib/items": typeof lib_items;
  "lib/line": typeof lib_line;
  "lib/settings": typeof lib_settings;
  "line/ingest": typeof line_ingest;
  "line/send": typeof line_send;
  members: typeof members;
  "push/digest": typeof push_digest;
  "push/subscriptions": typeof push_subscriptions;
  settings: typeof settings;
  sources: typeof sources;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
